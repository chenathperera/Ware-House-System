import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import BillOfMaterials from "../src/server/models/BillOfMaterials.js";
import Product from "../src/server/models/Product.js";
import ProductionOrder from "../src/server/models/ProductionOrder.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import { approveProductionOrder, completeProductionOrder, createProductionOrder, startProductionOrder } from "../src/server/services/productionOrderApiService.js";
const uri = "mongodb://127.0.0.1:27018/?replicaSet=stockTestRs"; const dbName = "warehouse_system_production_orders_test"; const res = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });
test("Production Orders preserve BOM planning, lifecycle, and atomic stock movements", { timeout: 120000 }, async (t) => { assert.equal(process.env.MONGODB_URI, uri); assert.equal(process.env.MONGODB_DB_NAME, dbName); await mongoose.connect(uri, { dbName }); const ids = { products: [], users: [], warehouses: [], boms: [], orders: [] }; const add = (group, doc) => (ids[group].push(doc._id), doc); const suffix = new mongoose.Types.ObjectId().toString().slice(-7); t.after(async () => { try { await Promise.all([ProductionOrder.collection.deleteMany({ _id: { $in: ids.orders } }), BillOfMaterials.collection.deleteMany({ _id: { $in: ids.boms } }), StockMovement.collection.deleteMany({ productId: { $in: ids.products } }), StockItem.collection.deleteMany({ productId: { $in: ids.products } }), Product.collection.deleteMany({ _id: { $in: ids.products } }), Warehouse.collection.deleteMany({ _id: { $in: ids.warehouses } }), User.collection.deleteMany({ _id: { $in: ids.users } })]); } finally { await mongoose.disconnect(); } }); const user = add("users", await User.create({ firstName: "Prod", lastName: "Test", email: `prod-${suffix}@example.test`, password: "Password9!", role: "admin" })); const material = add("products", await Product.create({ name: `Material ${suffix}`, productType: "raw_material", categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "kg", basePrice: 2 })); const finished = add("products", await Product.create({ name: `Finished ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 10 })); const source = add("warehouses", await Warehouse.create({ name: `Source ${suffix}`, warehouseCode: `PS${suffix}`.toUpperCase() })); const output = add("warehouses", await Warehouse.create({ name: `Output ${suffix}`, warehouseCode: `PO${suffix}`.toUpperCase() })); await StockItem.create({ productId: material._id, productCode: material.productCode, productName: material.name, warehouseId: source._id, unitOfMeasure: "kg", costPerUnit: 3, quantities: { onHand: 10, reserved: 0, available: 10 } }); const bom = add("boms", await BillOfMaterials.create({ name: "Production BOM", finishedProductId: finished._id, finishedProductCode: finished.productCode, finishedProductName: finished.name, outputQuantity: 2, outputUnitOfMeasure: "pcs", components: [{ productId: material._id, productCode: material.productCode, productName: material.name, quantity: 2, unitOfMeasure: "kg", standardCost: 3 }], status: "active" })); const create = res(); await createProductionOrder({ user, body: { bomId: String(bom._id), plannedQuantity: 4, sourceWarehouseId: String(source._id), outputWarehouseId: String(output._id), sourceType: "sales_order", sourceSalesOrderId: String(new mongoose.Types.ObjectId()) } }, create); const po = create.body.data; ids.orders.push(po._id); assert.match(po.productionNumber, /^PO-PRD-/); assert.equal(po.consumption[0].plannedQuantity, 4); await approveProductionOrder({ params: { id: String(po._id) }, user }, res()); await startProductionOrder({ params: { id: String(po._id) }, user }, res()); const current = await ProductionOrder.findById(po._id); const done = res(); await completeProductionOrder({ params: { id: String(po._id) }, user, body: { actualConsumption: [{ consumptionItemId: String(current.consumption[0]._id), actualQuantity: 4 }], output: [{ actualQuantity: 3, damagedQuantity: 1, batchNumber: "BATCH-1" }], overheadCost: 2 } }, done); const completed = await ProductionOrder.findById(po._id); assert.equal(completed.status, "partially_completed"); assert.equal((await StockItem.findOne({ productId: material._id, warehouseId: source._id })).quantities.onHand, 6); assert.equal((await StockItem.findOne({ productId: finished._id, warehouseId: output._id })).quantities.onHand, 3); assert.deepEqual((await StockMovement.find({ "sourceDocument.id": po._id }).sort({ movementType: 1 })).map((item) => item.movementType), ["production_consume", "production_output", "production_scrap"]); });

test("Production Orders reject invalid lifecycle transitions and insufficient material stock", { timeout: 120000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  assert.equal(process.env.MONGODB_DB_NAME, dbName);
  await mongoose.connect(uri, { dbName });
  const ids = { products: [], warehouses: [], orders: [] };
  const suffix = new mongoose.Types.ObjectId().toString().slice(-7);
  t.after(async () => {
    try {
      await Promise.all([
        ProductionOrder.collection.deleteMany({ _id: { $in: ids.orders } }),
        StockMovement.collection.deleteMany({ productId: { $in: ids.products } }),
        StockItem.collection.deleteMany({ productId: { $in: ids.products } }),
        Product.collection.deleteMany({ _id: { $in: ids.products } }),
        Warehouse.collection.deleteMany({ _id: { $in: ids.warehouses } }),
      ]);
    } finally { await mongoose.disconnect(); }
  });
  const material = await Product.create({ name: `Short material ${suffix}`, productType: "raw_material", categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "kg", basePrice: 1 });
  const finished = await Product.create({ name: `Short finished ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 1 });
  const source = await Warehouse.create({ name: `Short source ${suffix}`, warehouseCode: `SS${suffix}`.toUpperCase() });
  const output = await Warehouse.create({ name: `Short output ${suffix}`, warehouseCode: `SO${suffix}`.toUpperCase() });
  ids.products.push(material._id, finished._id); ids.warehouses.push(source._id, output._id);
  const make = async (status) => {
    const order = await ProductionOrder.create({ bomId: new mongoose.Types.ObjectId(), finishedProductId: finished._id, finishedProductName: finished.name, plannedQuantity: 2, sourceWarehouseId: source._id, outputWarehouseId: output._id, status, consumption: [{ productId: material._id, productName: material.name, plannedQuantity: 2, unitOfMeasure: "kg", warehouseId: source._id }], output: [{ productId: finished._id, productName: finished.name, plannedQuantity: 2, unitOfMeasure: "pcs", warehouseId: output._id }] });
    ids.orders.push(order._id); return order;
  };
  const draft = await make("draft");
  await assert.rejects(() => startProductionOrder({ params: { id: String(draft._id) }, user: { _id: new mongoose.Types.ObjectId() } }, res()), /Cannot start order with status 'draft'/);
  assert.equal((await ProductionOrder.findById(draft._id)).status, "draft");
  const planned = await make("planned");
  await assert.rejects(() => startProductionOrder({ params: { id: String(planned._id) }, user: { _id: new mongoose.Types.ObjectId() } }, res()), /Insufficient/);
  assert.equal((await ProductionOrder.findById(planned._id)).status, "planned");
  assert.equal(await StockMovement.countDocuments({ "sourceDocument.id": planned._id }), 0);
});

test("Production completion rolls back consumed material when output stock cannot be created", { timeout: 120000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  assert.equal(process.env.MONGODB_DB_NAME, dbName);
  await mongoose.connect(uri, { dbName });
  const ids = { products: [], warehouses: [], orders: [] };
  const suffix = new mongoose.Types.ObjectId().toString().slice(-7);
  t.after(async () => {
    try {
      await Promise.all([
        ProductionOrder.collection.deleteMany({ _id: { $in: ids.orders } }),
        StockMovement.collection.deleteMany({ productId: { $in: ids.products } }),
        StockItem.collection.deleteMany({ productId: { $in: ids.products } }),
        Product.collection.deleteMany({ _id: { $in: ids.products } }),
        Warehouse.collection.deleteMany({ _id: { $in: ids.warehouses } }),
      ]);
    } finally { await mongoose.disconnect(); }
  });
  const material = await Product.create({ name: `Rollback material ${suffix}`, productType: "raw_material", categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "kg", basePrice: 2 });
  const finished = await Product.create({ name: `Rollback finished ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 4 });
  const source = await Warehouse.create({ name: `Rollback source ${suffix}`, warehouseCode: `RS${suffix}`.toUpperCase() });
  ids.products.push(material._id, finished._id); ids.warehouses.push(source._id);
  await StockItem.create({ productId: material._id, productCode: material.productCode, productName: material.name, warehouseId: source._id, unitOfMeasure: "kg", costPerUnit: 2, quantities: { onHand: 5, reserved: 0, available: 5 } });
  const order = await ProductionOrder.create({ bomId: new mongoose.Types.ObjectId(), finishedProductId: finished._id, finishedProductName: finished.name, plannedQuantity: 2, sourceWarehouseId: source._id, outputWarehouseId: new mongoose.Types.ObjectId(), status: "in_progress", consumption: [{ productId: material._id, productCode: material.productCode, productName: material.name, plannedQuantity: 2, unitOfMeasure: "kg", warehouseId: source._id }], output: [{ productId: finished._id, productCode: finished.productCode, productName: finished.name, plannedQuantity: 2, unitOfMeasure: "pcs" }] });
  ids.orders.push(order._id);
  await assert.rejects(() => completeProductionOrder({ params: { id: String(order._id) }, user: { _id: new mongoose.Types.ObjectId() }, body: { actualConsumption: [{ consumptionItemId: String(order.consumption[0]._id), actualQuantity: 2 }], output: [{ actualQuantity: 2, damagedQuantity: 1, batchNumber: "ROLLBACK" }] } }, res()), /Warehouse .* not found/);
  const persisted = await ProductionOrder.findById(order._id);
  const rawStock = await StockItem.findOne({ productId: material._id, warehouseId: source._id });
  assert.equal(persisted.status, "in_progress");
  assert.equal(persisted.totalProduced, 0);
  assert.equal(persisted.consumption[0].actualQuantity, 0);
  assert.equal(rawStock.quantities.onHand, 5);
  assert.equal(await StockItem.countDocuments({ productId: finished._id }), 0);
  assert.equal(await StockMovement.countDocuments({ "sourceDocument.id": order._id, movementType: { $in: ["production_consume", "production_output", "production_scrap"] } }), 0);
});
