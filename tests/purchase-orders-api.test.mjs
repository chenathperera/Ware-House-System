import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import PurchaseOrder from "../src/server/models/PurchaseOrder.js";
import Product from "../src/server/models/Product.js";
import Supplier from "../src/server/models/Supplier.js";
import Warehouse from "../src/server/models/Warehouse.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import StockReservation from "../src/server/models/StockReservation.js";
import User from "../src/server/models/User.js";
import generateToken from "../src/server/auth/token.js";
import {
  GET as purchaseOrdersGetRoute,
  POST as purchaseOrdersPostRoute,
} from "../src/app/api/purchase-orders/route.js";
import {
  DELETE as purchaseOrderDeleteRoute,
  GET as purchaseOrderDetailRoute,
  PUT as purchaseOrderPutRoute,
} from "../src/app/api/purchase-orders/[id]/route.js";
import { PATCH as purchaseOrderStatusRoute } from "../src/app/api/purchase-orders/[id]/status/route.js";

const apiUri = "mongodb://127.0.0.1:27017/warehouse_system_next";

function apiRequest(method, path, user, body) {
  return new Request(`http://purchase-orders.test${path}`, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${generateToken(user._id)}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function callRoute(handler, path, { method = "GET", user, body, params = {} } = {}) {
  const response = await handler(apiRequest(method, path, user, body), {
    params: Promise.resolve(params),
  });
  return { status: response.status, body: await response.json() };
}

function expectApi(result, status, message) {
  assert.equal(result.status, status, JSON.stringify(result.body));
  if (message) assert.equal(result.body.message, message);
  return result.body;
}

test("PurchaseOrder source model preserves counter, calculations, receiving fields, GRN contract, and no stock mutation", async (t) => {
  assert.equal(process.env.MONGODB_URI, "mongodb://127.0.0.1:27017/warehouse_system_next");
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const supplier = await Supplier.create({ displayName: `PO ${suffix}`, supplierCode: `PO${suffix}`, type: "company" });
  const warehouse = await Warehouse.create({ warehouseCode: `PO${suffix}`.toUpperCase(), name: `PO ${suffix}` });
  const product = await Product.create({ name: `PO ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 1, tax: { taxable: true, taxRate: 10 } });
  const stockBefore = { items: await StockItem.countDocuments(), movements: await StockMovement.countDocuments(), reservations: await StockReservation.countDocuments() };
  t.after(async () => { await PurchaseOrder.deleteMany({ supplierId: supplier._id }); await Product.deleteOne({ _id: product._id }); await Supplier.deleteOne({ _id: supplier._id }); await Warehouse.deleteOne({ _id: warehouse._id }); await mongoose.disconnect(); });
  const po = await PurchaseOrder.create({ supplierId: supplier._id, supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode }, deliverTo: { warehouseId: warehouse._id, warehouseName: warehouse.name }, items: [{ productId: product._id, productCode: product.productCode, productName: product.name, unitOfMeasure: product.unitOfMeasure, orderedQuantity: 2, unitPrice: 100, discountPercent: 10, discountAmount: 5, taxRate: 10, taxable: true }], shippingCost: 10, otherCharges: 2, createdBy: new mongoose.Types.ObjectId() });
  assert.match(po.poNumber, /^PO-\d+$/); assert.equal(po.items[0].lineSubtotal, 200); assert.equal(po.items[0].lineDiscount, 25); assert.equal(po.items[0].lineTax, 17.5); assert.equal(po.items[0].lineTotal, 192.5); assert.equal(po.subtotal, 200); assert.equal(po.totalDiscount, 25); assert.equal(po.totalTax, 17.5); assert.equal(po.grandTotal, 204.5); assert.equal(po.items[0].pendingQuantity, 2); assert.equal(po.receiptCompletionPercent, 0); assert.equal(po.grns.length, 0);
  assert.deepEqual({ items: await StockItem.countDocuments(), movements: await StockMovement.countDocuments(), reservations: await StockReservation.countDocuments() }, stockBefore);
  po.status = "approved"; await po.save(); po.status = "sent"; await po.save(); assert.equal(po.status, "sent");
  const hidden = await PurchaseOrder.findById(po._id); hidden.deletedAt = new Date(); await hidden.save(); assert.equal(await PurchaseOrder.findById(po._id), null);
});

test("Purchase Order routes preserve authorization and read API contracts", async (t) => {
  assert.equal(process.env.MONGODB_URI, apiUri, "Refusing an unapproved database");
  await mongoose.connect(apiUri, { autoIndex: false, autoCreate: false });

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const created = { purchaseOrders: [], products: [], suppliers: [], users: [], warehouses: [] };
  const track = (type, document) => {
    created[type].push(document._id);
    return document;
  };
  t.after(async () => {
    try {
      await PurchaseOrder.collection.deleteMany({ _id: { $in: created.purchaseOrders } });
      await Product.collection.deleteMany({ _id: { $in: created.products } });
      await Supplier.collection.deleteMany({ _id: { $in: created.suppliers } });
      await Warehouse.collection.deleteMany({ _id: { $in: created.warehouses } });
      await User.collection.deleteMany({ _id: { $in: created.users } });
    } finally {
      await mongoose.disconnect();
    }
  });

  const makeUser = async (role) => track("users", await User.create({
    firstName: `PO ${role}`,
    lastName: suffix,
    email: `po-${role}-${suffix}@example.invalid`,
    password: "SyntheticPass9",
    role,
  }));
  const admin = await makeUser("admin");
  const manager = await makeUser("manager");
  const accountant = await makeUser("accountant");
  const warehouseStaff = await makeUser("warehouse_staff");

  const createSupplier = async (label) => track("suppliers", await Supplier.create({
    displayName: `${label} ${suffix}`,
    supplierCode: `${label.slice(0, 3).toUpperCase()}${suffix}`,
    primaryContact: { name: `${label} Contact`, phone: "0771234567" },
    billingAddress: { line1: `${label} billing` },
    paymentTerms: { type: "credit", creditDays: 14 },
  }));
  const createWarehouse = async (label) => track("warehouses", await Warehouse.create({
    warehouseCode: `${label.slice(0, 3).toUpperCase()}${suffix}`,
    name: `${label} ${suffix}`,
    address: { line1: `${label} address` },
  }));
  const createProduct = async (label) => track("products", await Product.create({
    name: `${label} ${suffix}`,
    categoryId: new mongoose.Types.ObjectId(),
    unitOfMeasure: "pcs",
    basePrice: 10,
    tax: { taxable: true, taxRate: 8 },
  }));

  const routeSupplier = await createSupplier("Route supplier");
  const routeWarehouse = await createWarehouse("Route warehouse");
  const product = await createProduct("Route product");
  const routeBody = {
    supplierId: String(routeSupplier._id),
    deliverTo: { warehouseId: String(routeWarehouse._id) },
    items: [{ productId: String(product._id), orderedQuantity: 2, unitPrice: 25 }],
    notes: "Route authorization fixture",
  };
  const missingId = new mongoose.Types.ObjectId().toString();

  await t.test("route authorization preserves original status and error behavior", async () => {
    expectApi(await callRoute(purchaseOrdersGetRoute, "/api/purchase-orders"), 401, "Not authorized, no token provided");
    expectApi(await callRoute(purchaseOrderDetailRoute, `/api/purchase-orders/${missingId}`, { params: { id: missingId } }), 401, "Not authorized, no token provided");

    for (const user of [admin, manager, accountant]) {
      const response = expectApi(await callRoute(purchaseOrdersPostRoute, "/api/purchase-orders", { method: "POST", user, body: routeBody }), 201);
      assert.deepEqual(Object.keys(response).sort(), ["data", "success"]);
      created.purchaseOrders.push(new mongoose.Types.ObjectId(response.data._id));
    }
    expectApi(await callRoute(purchaseOrdersPostRoute, "/api/purchase-orders", { method: "POST", user: warehouseStaff, body: routeBody }), 403, "Role 'warehouse_staff' is not authorized for this action");

    for (const user of [admin, manager, accountant]) {
      expectApi(await callRoute(purchaseOrderPutRoute, `/api/purchase-orders/${missingId}`, { method: "PUT", user, body: {}, params: { id: missingId } }), 404, "Purchase order not found");
      expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${missingId}/status`, { method: "PATCH", user, body: {}, params: { id: missingId } }), 404, "Purchase order not found");
    }
    expectApi(await callRoute(purchaseOrderPutRoute, `/api/purchase-orders/${missingId}`, { method: "PUT", user: warehouseStaff, body: {}, params: { id: missingId } }), 403, "Role 'warehouse_staff' is not authorized for this action");
    expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${missingId}/status`, { method: "PATCH", user: warehouseStaff, body: {}, params: { id: missingId } }), 403, "Role 'warehouse_staff' is not authorized for this action");

    for (const user of [admin, manager]) {
      expectApi(await callRoute(purchaseOrderDeleteRoute, `/api/purchase-orders/${missingId}`, { method: "DELETE", user, params: { id: missingId } }), 404, "Purchase order not found");
    }
    expectApi(await callRoute(purchaseOrderDeleteRoute, `/api/purchase-orders/${missingId}`, { method: "DELETE", user: accountant, params: { id: missingId } }), 403, "Role 'accountant' is not authorized for this action");
    expectApi(await callRoute(purchaseOrderDeleteRoute, `/api/purchase-orders/${missingId}`, { method: "DELETE", user: warehouseStaff, params: { id: missingId } }), 403, "Role 'warehouse_staff' is not authorized for this action");
  });

  const listSupplier = await createSupplier("List supplier");
  const detailSupplier = await createSupplier("Detail searchable supplier");
  const listWarehouse = await createWarehouse("List warehouse");
  const detailWarehouse = await createWarehouse("Detail warehouse");
  const createPurchaseOrder = async ({ supplier, warehouse, poNumber, poDate, status = "draft", productName = product.name, createdBy = admin }) => {
    const po = await PurchaseOrder.create({
      poNumber,
      poDate,
      supplierId: supplier._id,
      supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode, taxRegistrationNumber: supplier.taxRegistrationNumber, contactName: supplier.primaryContact.name, phone: supplier.primaryContact.phone },
      supplierBillingAddress: supplier.billingAddress,
      deliverTo: { warehouseId: warehouse._id, warehouseName: warehouse.name, address: warehouse.address },
      items: [{ productId: product._id, productCode: product.productCode, productName, unitOfMeasure: product.unitOfMeasure, orderedQuantity: 2, unitPrice: 25, taxRate: 8, taxable: true }],
      paymentTerms: { type: "credit", creditDays: 14 },
      status,
      createdBy: createdBy._id,
    });
    created.purchaseOrders.push(po._id);
    return po;
  };
  const listFirst = await createPurchaseOrder({ supplier: listSupplier, warehouse: listWarehouse, poNumber: `PO-${suffix}-ALPHA`, poDate: new Date("2026-01-10T00:00:00.000Z") });
  const listSecond = await createPurchaseOrder({ supplier: listSupplier, warehouse: listWarehouse, poNumber: `PO-${suffix}-BETA`, poDate: new Date("2026-02-10T00:00:00.000Z") });
  const listThird = await createPurchaseOrder({ supplier: listSupplier, warehouse: listWarehouse, poNumber: `PO-${suffix}-GAMMA`, poDate: new Date("2026-03-10T00:00:00.000Z") });
  const detailPo = await createPurchaseOrder({ supplier: detailSupplier, warehouse: detailWarehouse, poNumber: `PO-${suffix}-DETAIL`, poDate: new Date("2026-02-15T00:00:00.000Z"), status: "approved", productName: "Detailed product snapshot" });
  const hiddenPo = await createPurchaseOrder({ supplier: detailSupplier, warehouse: detailWarehouse, poNumber: `PO-${suffix}-HIDDEN`, poDate: new Date("2026-02-20T00:00:00.000Z"), status: "closed" });
  await PurchaseOrder.collection.updateOne({ _id: hiddenPo._id }, { $set: { deletedAt: new Date() } });

  await t.test("list API preserves original envelope, filters, sorting, pagination, population, and soft-delete visibility", async () => {
    const list = expectApi(await callRoute(purchaseOrdersGetRoute, `/api/purchase-orders?supplierId=${listSupplier._id}&page=2&limit=1&sortBy=poDate&sortOrder=asc`, { user: warehouseStaff }), 200);
    assert.deepEqual(Object.keys(list).sort(), ["count", "data", "page", "success", "total", "totalPages"]);
    assert.equal(list.count, 1);
    assert.equal(list.total, 3);
    assert.equal(list.page, 2);
    assert.equal(list.totalPages, 3);
    assert.equal(list.data[0]._id, String(listSecond._id));
    assert.equal(list.data[0].supplierId.displayName, listSupplier.displayName);
    assert.equal(list.data[0].deliverTo.warehouseId.name, listWarehouse.name);

    const status = expectApi(await callRoute(purchaseOrdersGetRoute, "/api/purchase-orders?status=approved", { user: warehouseStaff }), 200);
    assert.ok(status.data.some((po) => po._id === String(detailPo._id)));
    const warehouse = expectApi(await callRoute(purchaseOrdersGetRoute, `/api/purchase-orders?warehouseId=${listWarehouse._id}`, { user: warehouseStaff }), 200);
    assert.deepEqual(warehouse.data.map((po) => po._id).sort(), [listFirst, listSecond, listThird].map((po) => String(po._id)).sort());
    const searched = expectApi(await callRoute(purchaseOrdersGetRoute, `/api/purchase-orders?search=${encodeURIComponent("Detail searchable")}`, { user: warehouseStaff }), 200);
    assert.deepEqual(searched.data.map((po) => po._id), [String(detailPo._id)]);
    const dated = expectApi(await callRoute(purchaseOrdersGetRoute, "/api/purchase-orders?startDate=2026-02-01&endDate=2026-02-28", { user: warehouseStaff }), 200);
    assert.deepEqual(dated.data.map((po) => po._id).sort(), [detailPo, listSecond].map((po) => String(po._id)).sort());
    const empty = expectApi(await callRoute(purchaseOrdersGetRoute, "/api/purchase-orders?status=cancelled", { user: warehouseStaff }), 200);
    assert.deepEqual(empty, { success: true, count: 0, total: 0, page: 1, totalPages: 0, data: [] });
    const hidden = expectApi(await callRoute(purchaseOrdersGetRoute, `/api/purchase-orders?search=${encodeURIComponent("HIDDEN")}`, { user: warehouseStaff }), 200);
    assert.equal(hidden.count, 0);
    assert.deepEqual(hidden.data, []);
  });

  await t.test("detail API preserves original envelope, populated references, snapshots, and missing/soft-deleted behavior", async () => {
    const detail = expectApi(await callRoute(purchaseOrderDetailRoute, `/api/purchase-orders/${detailPo._id}`, { user: warehouseStaff, params: { id: String(detailPo._id) } }), 200);
    assert.deepEqual(Object.keys(detail).sort(), ["data", "success"]);
    assert.equal(detail.data.supplierId.displayName, detailSupplier.displayName);
    assert.equal(detail.data.supplierId.supplierCode, detailSupplier.supplierCode);
    assert.equal(detail.data.deliverTo.warehouseId.name, detailWarehouse.name);
    assert.equal(detail.data.items[0].productId.name, product.name);
    assert.equal(detail.data.createdBy.firstName, admin.firstName);
    assert.equal(detail.data.supplierSnapshot.name, detailSupplier.displayName);
    assert.equal(detail.data.supplierSnapshot.code, detailSupplier.supplierCode);
    assert.deepEqual(detail.data.grns, []);

    expectApi(await callRoute(purchaseOrderDetailRoute, `/api/purchase-orders/${missingId}`, { user: warehouseStaff, params: { id: missingId } }), 404, "Purchase order not found");
    expectApi(await callRoute(purchaseOrderDetailRoute, `/api/purchase-orders/${hiddenPo._id}`, { user: warehouseStaff, params: { id: String(hiddenPo._id) } }), 404, "Purchase order not found");
  });
});

test("Purchase Order update, lifecycle, and delete contracts preserve original behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, apiUri, "Refusing an unapproved database");
  await mongoose.connect(apiUri, { autoIndex: false, autoCreate: false });

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const stockBefore = {
    items: await StockItem.countDocuments(),
    movements: await StockMovement.countDocuments(),
    reservations: await StockReservation.countDocuments(),
  };
  const created = { purchaseOrders: [], products: [], suppliers: [], users: [], warehouses: [] };
  const track = (type, document) => {
    created[type].push(document._id);
    return document;
  };
  t.after(async () => {
    try {
      await PurchaseOrder.collection.deleteMany({ _id: { $in: created.purchaseOrders } });
      await Product.collection.deleteMany({ _id: { $in: created.products } });
      await Supplier.collection.deleteMany({ _id: { $in: created.suppliers } });
      await Warehouse.collection.deleteMany({ _id: { $in: created.warehouses } });
      await User.collection.deleteMany({ _id: { $in: created.users } });
    } finally {
      await mongoose.disconnect();
    }
  });

  const admin = track("users", await User.create({
    firstName: "Lifecycle",
    lastName: "Admin",
    email: `po-lifecycle-admin-${suffix}@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  }));
  const manager = track("users", await User.create({
    firstName: "Lifecycle",
    lastName: "Manager",
    email: `po-lifecycle-manager-${suffix}@example.invalid`,
    password: "SyntheticPass9",
    role: "manager",
  }));
  const supplier = track("suppliers", await Supplier.create({
    displayName: `PO original supplier ${suffix}`,
    supplierCode: `POS${suffix}`,
    primaryContact: { name: "Original contact", phone: "0771000000" },
    billingAddress: { line1: "Original billing address" },
    paymentTerms: { type: "credit", creditDays: 10 },
  }));
  const replacementSupplier = track("suppliers", await Supplier.create({
    displayName: `PO replacement supplier ${suffix}`,
    supplierCode: `POR${suffix}`,
    primaryContact: { name: "Replacement contact", phone: "0772000000" },
    billingAddress: { line1: "Replacement billing address" },
  }));
  const warehouse = track("warehouses", await Warehouse.create({
    warehouseCode: `POA${suffix}`,
    name: `PO original warehouse ${suffix}`,
    address: { line1: "Original warehouse address" },
  }));
  const replacementWarehouse = track("warehouses", await Warehouse.create({
    warehouseCode: `POB${suffix}`,
    name: `PO replacement warehouse ${suffix}`,
    address: { line1: "Replacement warehouse address" },
  }));
  const originalProduct = track("products", await Product.create({
    name: `PO original product ${suffix}`,
    categoryId: new mongoose.Types.ObjectId(),
    unitOfMeasure: "pcs",
    basePrice: 10,
    tax: { taxable: true, taxRate: 5 },
  }));
  const replacementProduct = track("products", await Product.create({
    name: `PO replacement product ${suffix}`,
    categoryId: new mongoose.Types.ObjectId(),
    unitOfMeasure: "kg",
    basePrice: 20,
    tax: { taxable: true, taxRate: 8 },
  }));

  const makePurchaseOrder = async ({
    status = "draft",
    poNumber,
    receivedQuantity = 0,
    supplierId = supplier._id,
    warehouseId = warehouse._id,
  } = {}) => {
    const po = await PurchaseOrder.create({
      poNumber: poNumber ?? `PO-${suffix}-${created.purchaseOrders.length + 1}`,
      supplierId,
      supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode },
      supplierBillingAddress: supplier.billingAddress,
      deliverTo: { warehouseId, warehouseName: warehouse.name, address: warehouse.address },
      items: [{
        productId: originalProduct._id,
        productCode: originalProduct.productCode,
        productName: originalProduct.name,
        unitOfMeasure: originalProduct.unitOfMeasure,
        orderedQuantity: 2,
        receivedQuantity,
        unitPrice: 10,
        taxRate: 5,
        taxable: true,
      }],
      paymentTerms: { type: "credit", creditDays: 10 },
      status,
      createdBy: admin._id,
    });
    created.purchaseOrders.push(po._id);
    return po;
  };
  const callDetailRoute = (handler, id, options = {}) => callRoute(handler, `/api/purchase-orders/${id}`, {
    user: options.user ?? admin,
    params: { id: String(id) },
    ...options,
  });

  await t.test("update allows draft and pending approval, retains source snapshot behavior, and recalculates", async () => {
    const draft = await makePurchaseOrder({ poNumber: `PO-${suffix}-UPDATE-DRAFT` });
    const updated = expectApi(await callDetailRoute(purchaseOrderPutRoute, draft._id, {
      method: "PUT",
      user: manager,
      body: {
        supplierId: String(replacementSupplier._id),
        deliverTo: { warehouseId: String(replacementWarehouse._id) },
        poDate: "2026-04-10T00:00:00.000Z",
        expectedDeliveryDate: "2026-04-25T00:00:00.000Z",
        shippingTerms: "CIF",
        shippingCost: 11.5,
        otherCharges: 2.25,
        notes: "Supplier-facing update note",
        internalNotes: "Internal update note",
        items: [{
          productId: String(replacementProduct._id),
          orderedQuantity: 4,
          unitPrice: 20,
          discountPercent: 10,
          discountAmount: 3,
          taxRate: 8,
          taxable: true,
          notes: "Replacement product line",
        }],
      },
    }), 200);
    assert.deepEqual(Object.keys(updated).sort(), ["data", "success"]);
    assert.equal(updated.data.status, "draft");
    assert.equal(updated.data.supplierId, String(replacementSupplier._id));
    assert.equal(updated.data.deliverTo.warehouseId, String(replacementWarehouse._id));
    assert.equal(updated.data.supplierSnapshot.name, supplier.displayName);
    assert.equal(new Date(updated.data.poDate).toISOString(), "2026-04-10T00:00:00.000Z");
    assert.equal(new Date(updated.data.expectedDeliveryDate).toISOString(), "2026-04-25T00:00:00.000Z");
    assert.equal(updated.data.shippingTerms, "CIF");
    assert.equal(updated.data.shippingCost, 11.5);
    assert.equal(updated.data.otherCharges, 2.25);
    assert.equal(updated.data.notes, "Supplier-facing update note");
    assert.equal(updated.data.internalNotes, "Internal update note");
    assert.equal(updated.data.updatedBy, String(manager._id));
    assert.equal(updated.data.items[0].productId, String(replacementProduct._id));
    assert.equal(updated.data.items[0].productCode, replacementProduct.productCode);
    assert.equal(updated.data.items[0].productName, replacementProduct.name);
    assert.equal(updated.data.items[0].unitOfMeasure, replacementProduct.unitOfMeasure);
    assert.equal(updated.data.items[0].lineSubtotal, 80);
    assert.equal(updated.data.items[0].lineDiscount, 11);
    assert.equal(updated.data.items[0].lineTax, 5.52);
    assert.equal(updated.data.items[0].lineTotal, 74.52);
    assert.equal(updated.data.items[0].pendingQuantity, 4);
    assert.equal(updated.data.subtotal, 80);
    assert.equal(updated.data.totalDiscount, 11);
    assert.equal(updated.data.totalTax, 5.52);
    assert.equal(updated.data.grandTotal, 88.27);

    const pending = await makePurchaseOrder({ status: "pending_approval", poNumber: `PO-${suffix}-UPDATE-PENDING` });
    const pendingUpdated = expectApi(await callDetailRoute(purchaseOrderPutRoute, pending._id, {
      method: "PUT",
      body: { notes: "Pending approval is editable" },
    }), 200);
    assert.equal(pendingUpdated.data.status, "pending_approval");
    assert.equal(pendingUpdated.data.notes, "Pending approval is editable");
  });

  await t.test("update rejects every original non-editable status", async () => {
    for (const status of ["approved", "sent", "partially_received", "fully_received", "cancelled", "closed"]) {
      const po = await makePurchaseOrder({
        status,
        receivedQuantity: status === "partially_received" ? 1 : status === "fully_received" ? 2 : 0,
        poNumber: `PO-${suffix}-UPDATE-${status}`,
      });
      expectApi(await callDetailRoute(purchaseOrderPutRoute, po._id, {
        method: "PUT",
        body: { notes: "This must not be applied" },
      }), 400, `Cannot edit PO with status '${status}'`);
    }
  });

  await t.test("lifecycle preserves source transition map, attribution, timestamps, and receiving restrictions", async () => {
    const draft = await makePurchaseOrder({ poNumber: `PO-${suffix}-APPROVE-DRAFT` });
    const approved = expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${draft._id}/status`, {
      method: "PATCH",
      user: manager,
      body: { status: "approved" },
      params: { id: String(draft._id) },
    }), 200);
    assert.equal(approved.message, "PO status changed to approved");
    assert.equal(approved.data.status, "approved");
    assert.equal(approved.data.approvedBy, String(manager._id));
    assert.ok(approved.data.approvedAt);
    assert.equal(approved.data.updatedBy, String(manager._id));

    const pending = await makePurchaseOrder({ status: "pending_approval", poNumber: `PO-${suffix}-APPROVE-PENDING` });
    expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${pending._id}/status`, {
      method: "PATCH",
      user: admin,
      body: { status: "approved" },
      params: { id: String(pending._id) },
    }), 200);

    const approvedForSend = await makePurchaseOrder({ status: "approved", poNumber: `PO-${suffix}-SENT` });
    const sent = expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${approvedForSend._id}/status`, {
      method: "PATCH",
      user: manager,
      body: { status: "sent" },
      params: { id: String(approvedForSend._id) },
    }), 200);
    assert.equal(sent.data.status, "sent");
    assert.ok(sent.data.sentToSupplierAt);
    assert.equal(sent.data.updatedBy, String(manager._id));

    for (const status of ["draft", "pending_approval", "approved", "sent", "partially_received"]) {
      const po = await makePurchaseOrder({
        status,
        receivedQuantity: status === "partially_received" ? 1 : 0,
        poNumber: `PO-${suffix}-CANCEL-${status}`,
      });
      const cancelled = expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${po._id}/status`, {
        method: "PATCH",
        user: manager,
        body: { status: "cancelled", reason: `Cancel ${status}` },
        params: { id: String(po._id) },
      }), 200);
      assert.equal(cancelled.data.status, "cancelled");
      assert.equal(cancelled.data.cancellationReason, `Cancel ${status}`);
      assert.equal(cancelled.data.cancelledBy, String(manager._id));
      assert.ok(cancelled.data.cancelledAt);
    }

    for (const status of ["partially_received", "fully_received"]) {
      const po = await makePurchaseOrder({
        status,
        receivedQuantity: status === "partially_received" ? 1 : 2,
        poNumber: `PO-${suffix}-CLOSE-${status}`,
      });
      const closed = expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${po._id}/status`, {
        method: "PATCH",
        user: manager,
        body: { status: "closed" },
        params: { id: String(po._id) },
      }), 200);
      assert.equal(closed.data.status, "closed");
      assert.equal(closed.data.updatedBy, String(manager._id));
      assert.equal("closedAt" in closed.data, false);
    }

    const invalid = [
      ["draft", "sent"],
      ["approved", "received"],
      ["sent", "closed"],
      ["fully_received", "cancelled"],
      ["cancelled", "approved"],
      ["closed", "cancelled"],
    ];
    for (const [from, to] of invalid) {
      const po = await makePurchaseOrder({
        status: from,
        receivedQuantity: from === "fully_received" ? 2 : 0,
        poNumber: `PO-${suffix}-INVALID-${from}-${to}`,
      });
      expectApi(await callRoute(purchaseOrderStatusRoute, `/api/purchase-orders/${po._id}/status`, {
        method: "PATCH",
        user: admin,
        body: { status: to },
        params: { id: String(po._id) },
      }), 400, `Cannot change status from '${from}' to '${to}'`);
    }
  });

  await t.test("delete only soft-deletes drafts and keeps all non-drafts unavailable for deletion", async () => {
    const draft = await makePurchaseOrder({ poNumber: `PO-${suffix}-DELETE-DRAFT` });
    const deleted = expectApi(await callDetailRoute(purchaseOrderDeleteRoute, draft._id, { method: "DELETE" }), 200);
    assert.deepEqual(deleted, { success: true, message: "Draft PO deleted" });
    assert.equal(await PurchaseOrder.findById(draft._id), null);
    const stored = await PurchaseOrder.findById(draft._id).setOptions({ includeDeleted: true });
    assert.ok(stored.deletedAt);
    const list = expectApi(await callRoute(purchaseOrdersGetRoute, `/api/purchase-orders?search=${encodeURIComponent(draft.poNumber)}`, { user: admin }), 200);
    assert.deepEqual(list.data, []);
    expectApi(await callDetailRoute(purchaseOrderDetailRoute, draft._id), 404, "Purchase order not found");

    for (const status of ["pending_approval", "approved", "sent", "partially_received", "fully_received", "cancelled", "closed"]) {
      const po = await makePurchaseOrder({
        status,
        receivedQuantity: status === "partially_received" ? 1 : status === "fully_received" ? 2 : 0,
        poNumber: `PO-${suffix}-DELETE-${status}`,
      });
      expectApi(await callDetailRoute(purchaseOrderDeleteRoute, po._id, { method: "DELETE" }), 400, "Only draft POs can be deleted");
    }
  });

  await t.test("update, lifecycle, and delete do not mutate stock", async () => {
    const stockAfter = {
      items: await StockItem.countDocuments(),
      movements: await StockMovement.countDocuments(),
      reservations: await StockReservation.countDocuments(),
    };
    assert.deepEqual(stockAfter, stockBefore);
  });
});
