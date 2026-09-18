import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Brand from "../src/server/models/Brand.js";
import Category from "../src/server/models/Category.js";
import Counter from "../src/server/models/Counter.js";
import Product from "../src/server/models/Product.js";
import StockItem from "../src/server/models/StockItem.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import generateToken from "../src/server/auth/token.js";
import {
  GET as productsGetRoute,
  POST as productsPostRoute,
} from "../src/app/api/products/route.js";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "../src/server/services/productService.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../src/server/validators/productValidator.js";

const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `product-parity-${randomUUID()}`;

function response() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return payload;
    },
  };
}

function productBody(categoryId, brandId, overrides = {}) {
  return {
    name: "  Synthetic Product  ",
    categoryId: String(categoryId),
    brandId: String(brandId),
    unitOfMeasure: " pcs ",
    basePrice: 100,
    ...overrides,
  };
}

function jsonRequest(method, path, token, body) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("Product backend/data contract preserves the original controller and model behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved database");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  const ids = {
    products: [],
    stockItems: [],
    warehouses: [],
    category: null,
    brand: null,
    users: [],
  };
  const counterBefore = await Counter.collection.findOne({ _id: "product" });

  t.after(async () => {
    try {
      for (const id of ids.stockItems) await StockItem.collection.deleteOne({ _id: id });
      for (const id of ids.products) {
        await Product.collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      for (const id of ids.warehouses) await Warehouse.collection.deleteOne({ _id: id });
      if (ids.brand) await Brand.collection.deleteOne({ _id: ids.brand });
      if (ids.category) await Category.collection.deleteOne({ _id: ids.category });
      for (const id of ids.users) await User.collection.deleteOne({ _id: id });
      if (counterBefore) {
        await Counter.collection.replaceOne({ _id: "product" }, counterBefore, { upsert: true });
      } else {
        await Counter.collection.deleteOne({ _id: "product" });
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  const user = await User.create({
    firstName: "Product",
    lastName: "Parity",
    email: `${prefix}@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  });
  ids.users.push(user._id);

  const category = await Category.create({
    name: `${prefix} category`,
    code: prefix.replaceAll("-", "").slice(0, 20),
  });
  ids.category = category._id;

  const brand = await Brand.create({ name: `${prefix} brand`, code: prefix.slice(-12) });
  ids.brand = brand._id;

  const firstWarehouse = await Warehouse.create({
    warehouseCode: `${prefix.replaceAll("-", "").slice(0, 12)}A`,
    name: `${prefix} first`,
    isDefault: false,
  });
  const defaultWarehouse = await Warehouse.create({
    warehouseCode: `${prefix.replaceAll("-", "").slice(0, 12)}B`,
    name: `${prefix} default`,
    isDefault: true,
  });
  ids.warehouses.push(firstWarehouse._id, defaultWarehouse._id);

  await t.test("original validator accepts its declared contract and strips unsupported model fields", () => {
    const parsed = createProductSchema.parse(
      productBody(category._id, brand._id, {
        productNature: "variable",
        variations: [{ name: "Red", price: 10 }],
        comboItems: [{ productId: String(category._id), quantity: 1 }],
      }),
    );
    assert.equal("productNature" in parsed, false);
    assert.equal("variations" in parsed, false);
    assert.equal("comboItems" in parsed, false);
    assert.equal(createProductSchema.safeParse(productBody(category._id, "")).success, false);
    assert.deepEqual(updateProductSchema.parse({}), {});
  });

  let productId;
  await t.test("create generates code, persists defaults/nested values, populates refs, and creates default stock", async () => {
    const created = response();
    await createProduct(
      {
        body: productBody(category._id, brand._id, {
          sku: " sku-1 ",
          barcode: " barcode-1 ",
          shortName: " short ",
          tierPricing: [{ tierName: " retail ", minQuantity: 0, maxQuantity: 5, price: 125 }],
          tax: { hsCode: " hs-1 " },
          costs: { standardCost: 70 },
          stockLevels: { minimumLevel: 2 },
          packaging: { unitsPerCarton: 12 },
          salesConfig: { allowBackorder: true },
        }),
        user,
      },
      created,
    );

    assert.equal(created.statusCode, 201);
    const data = created.payload.data;
    productId = data._id;
    ids.products.push(productId);
    assert.match(data.productCode, /^PRD-\d+$/);
    assert.equal(data.name, "Synthetic Product");
    assert.equal(data.sku, "SKU-1");
    assert.equal(data.unitOfMeasure, "pcs");
    assert.equal(data.tierPricing[0].tierName, "retail");
    assert.equal(data.tax.hsCode, "hs-1");
    assert.equal(data.tax.taxable, true);
    assert.equal(data.tax.taxRate, 18);
    assert.equal(data.costs.standardCost, 70);
    assert.equal(data.costs.averageCost, 0);
    assert.equal(data.stockLevels.minimumLevel, 2);
    assert.equal(data.stockLevels.reorderLevel, 0);
    assert.equal(data.salesConfig.allowBackorder, true);
    assert.equal(data.salesConfig.minimumOrderQuantity, 1);
    assert.equal(data.categoryId.name, category.name);
    assert.equal(data.brandId.name, brand.name);

    const stock = await StockItem.findOne({ productId });
    ids.stockItems.push(stock._id);
    assert.equal(String(stock.warehouseId), String(defaultWarehouse._id));
    assert.equal(stock.productCode, data.productCode);
    assert.equal(stock.productName, data.name);
    assert.equal(stock.unitOfMeasure, data.unitOfMeasure);
    assert.deepEqual(stock.quantities.toObject(), { onHand: 0, reserved: 0, available: 0 });
    assert.equal(stock.costPerUnit, 0);
    assert.equal(stock.totalValue, 0);
  });

  await t.test("list preserves original filters, sort, pagination, population, and total semantics", async () => {
    const listed = response();
    await getProducts(
      {
        query: {
          search: "synthetic",
          categoryId: String(category._id),
          brandId: String(brand._id),
          type: "trading",
          minPrice: "100",
          maxPrice: "100",
          page: "1",
          limit: "1",
          sortBy: "name",
          sortOrder: "asc",
        },
      },
      listed,
    );
    assert.deepEqual(Object.keys(listed.payload).sort(), ["count", "data", "page", "success", "total", "totalPages"]);
    assert.equal(listed.payload.count, 1);
    assert.equal(listed.payload.total, 1);
    assert.equal(listed.payload.page, 1);
    assert.equal(listed.payload.totalPages, 1);
    assert.equal(listed.payload.data[0].categoryId.code, category.code);
    assert.equal(listed.payload.data[0].brandId.name, brand.name);
  });

  await t.test("detail populates category/brand and the creating/updating users", async () => {
    const detail = response();
    await getProductById({ params: { id: String(productId) } }, detail);
    assert.equal(detail.payload.data.categoryId.name, category.name);
    assert.equal(detail.payload.data.brandId.name, brand.name);
    assert.equal(detail.payload.data.createdBy.firstName, "Product");
    assert.equal(detail.payload.data.updatedBy, undefined);
  });

  await t.test("update saves first, synchronizes denormalized stock, and stamps call-price time", async () => {
    const updated = response();
    await updateProduct(
      {
        params: { id: String(productId) },
        body: { name: "Updated Product", unitOfMeasure: "box", callPrice: 80 },
        user,
      },
      updated,
    );
    assert.equal(updated.payload.data.name, "Updated Product");
    assert.equal(updated.payload.data.callPrice, 80);
    assert.ok(updated.payload.data.callPriceUpdatedAt);
    const stock = await StockItem.findOne({ productId });
    assert.equal(stock.productName, "Updated Product");
    assert.equal(stock.unitOfMeasure, "box");
  });

  await t.test("swallowed stock create/sync failures leave the Product mutation successful", async () => {
    const originalCreate = StockItem.create;
    const originalUpdateMany = StockItem.updateMany;
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      StockItem.create = async () => {
        throw new Error("synthetic stock create failure");
      };
      const created = response();
      await createProduct(
        { body: productBody(category._id, brand._id, { name: "Stock failure product" }), user },
        created,
      );
      assert.equal(created.statusCode, 201);
      ids.products.push(created.payload.data._id);

      StockItem.updateMany = async () => {
        throw new Error("synthetic stock sync failure");
      };
      const updated = response();
      await updateProduct(
        { params: { id: String(productId) }, body: { name: "Sync failure saved" }, user },
        updated,
      );
      assert.equal(updated.statusCode, 200);
      assert.equal(updated.payload.data.name, "Sync failure saved");
      assert.equal((await Product.findById(productId)).name, "Sync failure saved");
    } finally {
      StockItem.create = originalCreate;
      StockItem.updateMany = originalUpdateMany;
      console.error = originalConsoleError;
    }
  });

  await t.test("Route Handlers preserve authentication, role gate, and validator stripping", async () => {
    const staff = await User.create({
      firstName: "Product",
      lastName: "Staff",
      email: `${prefix}-staff@example.invalid`,
      password: "SyntheticPass9",
      role: "staff",
    });
    ids.users.push(staff._id);
    const staffToken = generateToken(staff._id);
    const adminToken = generateToken(user._id);

    const forbidden = await productsPostRoute(
      jsonRequest("POST", "/api/products", staffToken, productBody(category._id, brand._id)),
    );
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json()).message, "Role 'staff' is not authorized for this action");

    const invalid = await productsPostRoute(
      jsonRequest("POST", "/api/products", adminToken, productBody(category._id, "")),
    );
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).message, "Validation failed");

    // Keep the synthetic route create independent of an already-stale local
    // Product counter while still exercising the original generated-code hook.
    await Counter.collection.updateOne(
      { _id: "product" },
      { $set: { sequence: 500000000 } },
      { upsert: true },
    );

    const created = await productsPostRoute(
      jsonRequest(
        "POST",
        "/api/products",
        adminToken,
        productBody(category._id, brand._id, {
          name: `Route stripped ${prefix}`,
          sku: "route-1",
          productNature: "variable",
          variations: [{ name: "Red", price: 10 }],
        }),
      ),
    );
    const createdPayload = await created.json();
    assert.equal(created.status, 201, createdPayload.message);
    const routeProduct = createdPayload.data;
    ids.products.push(routeProduct._id);
    const routeStock = await StockItem.findOne({ productId: routeProduct._id });
    ids.stockItems.push(routeStock._id);
    assert.equal(routeProduct.productNature, "single");
    assert.equal(routeProduct.variations.length, 0);

    const list = await productsGetRoute(
      jsonRequest(
        "GET",
        `/api/products?search=${encodeURIComponent(`Route stripped ${prefix}`)}`,
        adminToken,
      ),
    );
    assert.equal(list.status, 200);
    const listPayload = await list.json();
    assert.ok(listPayload.data.some((product) => product._id === routeProduct._id));
  });

  await t.test("delete is a soft delete, inactivates Product, and leaves StockItem intact", async () => {
    const deleted = response();
    await deleteProduct({ params: { id: String(productId) } }, deleted);
    assert.deepEqual(deleted.payload, { success: true, message: "Product deleted" });
    assert.equal(await Product.findById(productId), null);
    const stored = await Product.findById(productId).setOptions({ includeDeleted: true });
    assert.equal(stored.status, "inactive");
    assert.ok(stored.deletedAt);
    assert.ok(await StockItem.findOne({ productId }));
  });
});
