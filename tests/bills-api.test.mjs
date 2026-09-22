import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import Bill from "../src/server/models/Bill.js";
import Counter from "../src/server/models/Counter.js";
import GoodsReceiptNote from "../src/server/models/GoodsReceiptNote.js";
import Supplier from "../src/server/models/Supplier.js";
import User from "../src/server/models/User.js";
import { GET as list, POST as create } from "../src/app/api/bills/route.js";
import { POST as fromGrn } from "../src/app/api/bills/from-grn/route.js";
import { GET as aging } from "../src/app/api/bills/aging/summary/route.js";
import { GET as detail } from "../src/app/api/bills/[id]/route.js";
import { PATCH as status } from "../src/app/api/bills/[id]/status/route.js";

function request(method, path, user, body) {
  return new Request(`http://bills.test${path}`, { method, headers: { ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function call(handler, path, { method = "GET", user, body, params = {} } = {}) {
  const response = await handler(request(method, path, user, body), { params: Promise.resolve(params) });
  return { status: response.status, body: await response.json() };
}
function expect(result, code, message) {
  assert.equal(result.status, code, JSON.stringify(result.body));
  if (message) assert.equal(result.body.message, message);
  return result.body;
}

test("Bills preserve source model, API, GRN derivation, aging, and no-side-effect contract", async (t) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const ids = { bills: [], grns: [], suppliers: [], users: [] };
  t.after(async () => {
    try {
      await Bill.collection.deleteMany({ _id: { $in: ids.bills } });
      await GoodsReceiptNote.collection.deleteMany({ _id: { $in: ids.grns } });
      await Supplier.collection.deleteMany({ _id: { $in: ids.suppliers } });
      await User.collection.deleteMany({ _id: { $in: ids.users } });
    } finally { await mongoose.disconnect(); }
  });
  const track = (kind, value) => { ids[kind].push(value._id); return value; };
  const admin = track("users", await User.create({ firstName: "Bill", lastName: "Admin", email: `bill-admin-${suffix}@example.invalid`, password: "Password9!", role: "admin" }));
  const staff = track("users", await User.create({ firstName: "Bill", lastName: "Staff", email: `bill-staff-${suffix}@example.invalid`, password: "Password9!", role: "warehouse_staff" }));
  const supplier = track("suppliers", await Supplier.create({ displayName: `Bill Supplier ${suffix}`, supplierCode: `BILL${suffix}`, taxRegistrationNumber: "VAT-1", paymentTerms: { type: "credit", creditDays: 14 } }));
  const payload = { supplierId: String(supplier._id), supplierInvoiceNumber: "INV-1", billDate: "2026-09-01", items: [{ productName: "Direct item", quantity: "2", unitPrice: "100", discountPercent: "10", discountAmount: 99, taxRate: "18", taxable: true, lineTotal: 1 }], shippingCost: "5", otherCharges: "2", globalDiscountAmount: 100 };

  await t.test("auth, roles, validation, calculated data, numbering, and stripping match source", async () => {
    expect(await call(list, "/api/bills"), 401, "Not authorized, no token provided");
    expect(await call(create, "/api/bills", { method: "POST", user: staff, body: payload }), 403, "Role 'warehouse_staff' is not authorized for this action");
    expect(await call(create, "/api/bills", { method: "POST", user: admin, body: { ...payload, items: [] } }), 400, "Validation failed");
    expect(await call(create, "/api/bills", { method: "POST", user: admin, body: { ...payload, supplierId: String(new mongoose.Types.ObjectId()) } }), 404, "Supplier not found");
    const created = expect(await call(create, "/api/bills", { method: "POST", user: admin, body: payload }), 201).data;
    ids.bills.push(created._id);
    assert.match(created.billNumber, /^BILL-\d+$/);
    assert.equal(created.items[0].discountAmount, 0);
    assert.equal(created.items[0].lineSubtotal, 200);
    assert.equal(created.items[0].lineDiscount, 20);
    assert.equal(created.items[0].lineTax, 32.4);
    assert.equal(created.grandTotal, 219.4);
    assert.equal(created.dueDate.slice(0, 10), "2026-09-15");
    assert.equal(created.supplierSnapshot.name, supplier.displayName);
    assert.equal((await Counter.findById("bill")).sequence, Number(created.billNumber.slice(5)));
  });

  const makeGrn = async (supplierId, number, discount = 0) => track("grns", await GoodsReceiptNote.create({ grnNumber: number, supplierId, warehouseId: new mongoose.Types.ObjectId(), items: [{ productId: new mongoose.Types.ObjectId(), productName: "GRN item", acceptedQuantity: 2, receivedQuantity: 2, unitPrice: 50, discountAmount: 0 }], billDiscountAmount: discount }));
  await t.test("GRN-derived bills preserve tax, fallback discount, repeat billing, and lack of GRN mutation", async () => {
    const grn = await makeGrn(supplier._id, `GRN-BILL-${suffix}`, 7);
    const first = expect(await call(fromGrn, "/api/bills/from-grn", { method: "POST", user: admin, body: { grnIds: [String(grn._id)], globalDiscountAmount: 999 } }), 201).data;
    ids.bills.push(first._id);
    assert.equal(first.items[0].taxRate, 18);
    assert.equal(first.globalDiscountAmount, 7, "validator strips submitted global discount");
    assert.equal(first.grnNumbers[0], grn.grnNumber);
    assert.equal((await GoodsReceiptNote.findById(grn._id)).status, "draft");
    const second = expect(await call(fromGrn, "/api/bills/from-grn", { method: "POST", user: admin, body: { grnIds: [String(grn._id)] } }), 201).data;
    ids.bills.push(second._id);
    const other = await makeGrn((await Supplier.create({ displayName: `Other ${suffix}`, supplierCode: `OTHER${suffix}` }))._id, `GRN-OTHER-${suffix}`);
    ids.suppliers.push(other.supplierId);
    expect(await call(fromGrn, "/api/bills/from-grn", { method: "POST", user: admin, body: { grnIds: [String(grn._id), String(other._id)] } }), 400, "All GRNs must belong to the same supplier");
  });

  await t.test("list, aging, detail, and unrestricted valid status paths preserve source responses", async () => {
    const listed = expect(await call(list, "/api/bills?search=INV&page=1&limit=1", { user: admin }), 200);
    assert.equal(listed.count, 1); assert.ok(listed.total >= 1);
    const bill = await Bill.findOne({ supplierInvoiceNumber: "INV-1" });
    const found = expect(await call(detail, `/api/bills/${bill._id}`, { user: admin, params: { id: bill._id } }), 200);
    assert.equal(found.data.billNumber, bill.billNumber);
    expect(await call(status, `/api/bills/${bill._id}/status`, { method: "PATCH", user: admin, params: { id: bill._id }, body: { status: "disputed", reason: "source behavior" } }), 200);
    assert.equal((await Bill.findById(bill._id)).paymentStatus, "disputed");
    const summary = expect(await call(aging, "/api/bills/aging/summary", { user: admin }), 200);
    assert.ok("current" in summary.data.buckets);
  });
});
