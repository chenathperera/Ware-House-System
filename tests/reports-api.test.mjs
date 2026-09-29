import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { GET as reportsGet } from "../src/app/api/reports/[...segments]/route.js";
import { GET as profitLossGet } from "../src/app/api/financial-reports/profit-and-loss/route.js";
import Attendance from "../src/server/models/Attendance.js";
import Bill from "../src/server/models/Bill.js";
import CustomerReturn from "../src/server/models/CustomerReturn.js";
import DamageRecord from "../src/server/models/DamageRecord.js";
import Employee from "../src/server/models/Employee.js";
import Expense from "../src/server/models/Expense.js";
import Invoice from "../src/server/models/Invoice.js";
import LeaveRequest from "../src/server/models/LeaveRequest.js";
import Payment from "../src/server/models/Payment.js";
import Payroll from "../src/server/models/Payroll.js";
import Product from "../src/server/models/Product.js";
import ProductionOrder from "../src/server/models/ProductionOrder.js";
import SalesOrder from "../src/server/models/SalesOrder.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_reports_test?replicaSet=stockTestRs";
const parsed = new URL(uri);
assert.equal(parsed.port, "27018");
assert.equal(parsed.pathname, "/warehouse_system_reports_test");
assert.equal(process.env.MONGODB_URI, uri);

const call = async (segments, query = "", user) => {
  const headers = user ? { authorization: `Bearer ${generateToken(user._id)}` } : {};
  const response = await reportsGet(
    new Request(`http://reports.test/api/reports/${segments.join("/")}${query}`, { headers }),
    { params: Promise.resolve({ segments }) },
  );
  return { status: response.status, body: await response.json() };
};

test("Reports API preserves source report calculations and filters", { timeout: 120000 }, async (t) => {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 27018 });
    socket.once("connect", () => { socket.end(); resolve(); });
    socket.once("error", reject);
  });
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  const id = () => new mongoose.Types.ObjectId();
  const now = new Date();
  const april = new Date("2026-04-15T12:00:00.000Z");
  const old = new Date("2025-01-01T12:00:00.000Z");
  const user = { _id: id(), firstName: "Report", lastName: "Admin", email: "reports@example.invalid", role: "admin", password: "unused", deletedAt: null };
  const customerA = id(); const customerB = id(); const productA = id(); const productB = id(); const warehouse = id(); const department = id(); const designation = id(); const employee = id();
  await User.collection.insertOne(user);
  await Warehouse.collection.insertOne({ _id: warehouse, name: "Main", warehouseCode: "MAIN", deletedAt: null });
  await Product.collection.insertMany([
    { _id: productA, productCode: "P-A", name: "Alpha", productType: "finished_good", canBeSold: true, status: "active", basePrice: 20, purchasePrice: 8, stockLevels: { reorderLevel: 10, minimumStock: 5 }, deletedAt: null },
    { _id: productB, productCode: "P-B", name: "Beta", productType: "raw_material", canBeSold: true, status: "active", basePrice: 10, purchasePrice: 4, stockLevels: { reorderLevel: 20, minimumStock: 10 }, deletedAt: null },
  ]);
  await SalesOrder.collection.insertMany([
    { _id: id(), customerId: customerA, customerSnapshot: { code: "C-A", name: "Customer A" }, orderDate: april, status: "approved", grandTotal: 100, items: [{ productId: productA, productCode: "P-A", productName: "Alpha", orderedQuantity: 4, unitPrice: 25, discountPercent: 10 }], deletedAt: null },
    { _id: id(), customerId: customerA, customerSnapshot: { code: "C-A", name: "Customer A" }, orderDate: april, status: "cancelled", grandTotal: 999, items: [{ productId: productB, productCode: "P-B", productName: "Beta", orderedQuantity: 99, unitPrice: 10 }], deletedAt: null },
    { _id: id(), customerId: customerB, customerSnapshot: { code: "C-B", name: "Customer B" }, orderDate: old, status: "approved", grandTotal: 50, items: [{ productId: productB, productCode: "P-B", productName: "Beta", orderedQuantity: 5, unitPrice: 10 }], deletedAt: null },
  ]);
  await Invoice.collection.insertMany([
    { _id: id(), customerId: customerA, invoiceDate: april, status: "approved", grandTotal: 120, subtotal: 120, totalDiscount: 20, amountPaid: 70, balanceDue: 50, paymentStatus: "partially_paid", agingBucket: "1_30", items: [{ productId: productA, quantity: 2, unitPrice: 60 }], deletedAt: null },
    { _id: id(), customerId: customerB, invoiceDate: april, status: "void", grandTotal: 30, subtotal: 30, totalDiscount: 0, amountPaid: 0, balanceDue: 30, paymentStatus: "unpaid", agingBucket: "current", items: [], deletedAt: null },
  ]);
  await Payment.collection.insertMany([{ _id: id(), direction: "received", paymentDate: april, amount: 70, deletedAt: null }, { _id: id(), direction: "paid", paymentDate: april, amount: 25, deletedAt: null }]);
  await StockItem.collection.insertMany([{ _id: id(), productId: productA, warehouseId: warehouse, quantities: { onHand: 12, reserved: 2 }, costPerUnit: 8 }, { _id: id(), productId: productB, warehouseId: warehouse, quantities: { onHand: 6, reserved: 1 }, costPerUnit: 4 }]);
  await StockMovement.collection.insertMany([{ _id: id(), productId: productA, warehouseId: warehouse, direction: "out", movementType: "sale_dispatch", quantity: 5, createdAt: now, performedBy: user._id }, { _id: id(), productId: productB, warehouseId: warehouse, direction: "out", movementType: "sale_dispatch", quantity: 2, createdAt: now, performedBy: user._id }]);
  await ProductionOrder.collection.insertMany([{ _id: id(), finishedProductId: productA, finishedProductCode: "P-A", finishedProductName: "Alpha", status: "completed", plannedQuantity: 10, totalProduced: 8, totalPlannedCost: 100, totalActualCost: 120, costVariance: 20, costPerUnit: 15, actualEndDate: april, createdAt: april, deletedAt: null }]);
  await DamageRecord.collection.insertMany([{ _id: id(), productId: productA, productCode: "P-A", productName: "Alpha", source: "production_reject", quantity: 2, totalValue: 16, createdAt: april, deletedAt: null }, { _id: id(), productId: productB, productCode: "P-B", productName: "Beta", source: "warehouse_damage", quantity: 3, totalValue: 12, createdAt: april, deletedAt: null }]);
  await CustomerReturn.collection.insertOne({ _id: id(), customerId: customerA, customerSnapshot: { code: "C-A", name: "Customer A" }, requestDate: april, status: "completed", totalReturnValue: 30, netRefundAmount: 25, items: [{ reason: "damaged", quantityReturned: 2, unitPrice: 15 }], deletedAt: null });
  await Bill.collection.insertOne({ _id: id(), billDate: april, grandTotal: 40, balanceDue: 40, paymentStatus: "unpaid", agingBucket: "current", deletedAt: null });
  await Expense.collection.insertOne({ _id: id(), date: april, amount: 10, category: "Utilities", status: "paid", deletedAt: null });
  await Employee.collection.insertOne({ _id: employee, employeeCode: "EMP-1", firstName: "Ada", lastName: "Lovelace", departmentId: department, designationId: designation, employmentType: "permanent", status: "active", deletedAt: null });
  await Attendance.collection.insertMany([{ _id: id(), employeeId: employee, employeeName: "Ada Lovelace", employeeCode: "EMP-1", date: april, status: "present", lateMinutes: 5, overtimeMinutes: 60 }, { _id: id(), employeeId: employee, employeeName: "Ada Lovelace", employeeCode: "EMP-1", date: april, status: "late", lateMinutes: 10, overtimeMinutes: 0 }]);
  await LeaveRequest.collection.insertOne({ _id: id(), employeeId: employee, employeeName: "Ada Lovelace", employeeCode: "EMP-1", leaveType: "annual", numberOfDays: 2, fromDate: new Date(now.getFullYear(), 2, 1), status: "approved", deletedAt: null });
  await Payroll.collection.insertOne({ _id: id(), periodMonth: 3, periodYear: now.getFullYear(), status: "paid", totalEmployees: 1, totalGrossEarnings: 1000, totalDeductions: 100, totalEpfEmployee: 80, totalEpfEmployer: 120, totalEtf: 30, totalApit: 20, totalNetPay: 900, deletedAt: null });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  await t.test("requires authentication", async () => { const result = await call(["sales", "summary"]); assert.equal(result.status, 401); });
  await t.test("sales reports preserve date, status, grouping, and customer values", async () => {
    const query = "?startDate=2026-04-01&endDate=2026-04-30";
    const summary = await call(["sales", "summary"], query, user); assert.equal(summary.body.data.orders.totalOrders, 1); assert.equal(summary.body.data.orders.totalValue, 100); assert.equal(summary.body.data.invoices.total, 150); assert.equal(summary.body.data.payments.collected, 70);
    const product = await call(["sales", "by-product"], query, user); assert.equal(product.body.data[0].productCode, "P-A"); assert.equal(product.body.data[0].netRevenue, 90);
    const customer = await call(["sales", "by-customer"], query, user); assert.equal(customer.body.data[0].customerCode, "C-A"); assert.equal(customer.body.data[0].outstanding, 50);
    const trend = await call(["sales", "trend"], `${query}&groupBy=month`, user); assert.deepEqual(trend.body.data, [{ label: "2026-04", count: 1, total: 100 }]);
  });
  await t.test("inventory reports preserve valuation, movement, ABC, and low-stock behavior", async () => {
    const valuation = await call(["inventory", "valuation"], "", user); assert.equal(valuation.body.data.summary.totalValue, 120); assert.equal(valuation.body.data.summary.totalUnits, 18);
    const movement = await call(["inventory", "movement"], "?productId=" + productA, user); assert.equal(movement.body.count, 1); assert.equal(movement.body.data[0].quantity, 5);
    const movers = await call(["inventory", "slow-fast-movers"], "?days=90", user); assert.equal(movers.body.data.classification.B[0].productCode, "P-A"); assert.equal(movers.body.data.summary.fastMovers, 0); assert.equal(movers.body.data.summary.deadStock, 0);
    const low = await call(["inventory", "low-stock"], "", user); assert.equal(low.body.data.length, 2); assert.equal(low.body.data[0].productCode, "P-B");
  });
  await t.test("production, returns, damages, financial, and HR calculations remain exact", async () => {
    const dates = "?startDate=2026-04-01&endDate=2026-04-30";
    const production = await call(["production", "summary"], dates, user); assert.equal(production.body.data.summary.yieldPercent, 80); assert.equal(production.body.data.summary.totalActualCost, 120);
    const product = await call(["production", "by-product"], dates, user); assert.equal(product.body.data[0].totalProduced, 8);
    const wastage = await call(["production", "wastage"], dates, user); assert.equal(wastage.body.data.totalWastageValue, 16);
    const returns = await call(["returns", "summary"], dates, user); assert.equal(returns.body.data.summary.totalRefunded, 25);
    const damages = await call(["damages", "summary"], dates, user); assert.equal(damages.body.data.summary.totalValue, 28);
    const financial = await call(["financial", "snapshot"], dates, user); assert.equal(financial.body.data.revenue, 150); assert.equal(financial.body.data.expenses, 50); assert.equal(financial.body.data.netCashFlow, 35);
    const headcount = await call(["hr", "headcount"], "", user); assert.equal(headcount.body.data.total, 1);
    const attendance = await call(["hr", "attendance-summary"], dates, user); assert.equal(attendance.body.data.byEmployee[0].totalLateMinutes, 15);
    const leaves = await call(["hr", "leave-patterns"], `?year=${now.getFullYear()}`, user); assert.equal(leaves.body.data.byType[0].totalDays, 2);
    const payroll = await call(["hr", "payroll-summary"], `?year=${now.getFullYear()}`, user); assert.equal(payroll.body.data.yearTotals.netPay, 900);
  });
  await t.test("profit and loss keeps its source formula and role guard", async () => {
    const response = await profitLossGet(new Request("http://reports.test/api/financial-reports/profit-and-loss?startDate=2026-04-01&endDate=2026-04-30", { headers: { authorization: `Bearer ${generateToken(user._id)}` } }));
    const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.data.revenue.totalRevenue, 100); assert.equal(body.data.cogs.totalCogs, 16); assert.equal(body.data.netProfit, 74);
  });
  await t.test("an empty report collection returns the source empty shape", async () => {
    await StockItem.collection.deleteMany({});
    const result = await call(["inventory", "low-stock"], "", user);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, []);
  });
});
