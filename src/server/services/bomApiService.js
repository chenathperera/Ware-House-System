import "server-only";
import BillOfMaterials from "../models/BillOfMaterials.js";
import Product from "../models/Product.js";
import StockItem from "../models/StockItem.js";

const populateList = (query) => query.populate("finishedProductId", "name productCode");
const populateDetail = (query) => query.populate("finishedProductId", "name productCode unitOfMeasure").populate("components.productId", "name productCode productType unitOfMeasure costs");
async function enrichComponents(components) {
  const products = await Product.find({ _id: { $in: components.map((item) => item.productId) } });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  return components.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new Error(`Component product ${item.productId} not found`);
    return { productId: product._id, productCode: product.productCode, productName: product.name, productType: product.productType, componentType: item.componentType || (product.productType === "raw_material" ? "raw_material" : product.productType) || "raw_material", quantity: item.quantity, unitOfMeasure: product.unitOfMeasure, wastagePercent: item.wastagePercent || 0, standardCost: item.standardCost ?? (product.costs?.averageCost || product.costs?.lastPurchaseCost || 0), productionStep: item.productionStep || 1, isOptional: item.isOptional || false, notes: item.notes };
  });
}
export async function createBom(req, res) {
  const { finishedProductId, components, ...rest } = req.body;
  const finished = await Product.findById(finishedProductId);
  if (!finished) { res.status(404); throw new Error("Finished product not found"); }
  if (!finished.canBeManufactured) { finished.canBeManufactured = true; await finished.save(); }
  const enriched = await enrichComponents(components);
  if (rest.isDefault !== false) await BillOfMaterials.updateMany({ finishedProductId, isDefault: true }, { $set: { isDefault: false } });
  const bom = await BillOfMaterials.create({ finishedProductId: finished._id, finishedProductCode: finished.productCode, finishedProductName: finished.name, outputUnitOfMeasure: rest.outputUnitOfMeasure || finished.unitOfMeasure, components: enriched, ...rest, createdBy: req.user._id });
  const data = await populateDetail(BillOfMaterials.findById(bom._id));
  res.status(201).json({ success: true, data });
}
export async function getBoms(req, res) {
  const { search, finishedProductId, status, isDefault, page = 1, limit = 20 } = req.query; const filter = {};
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { bomCode: { $regex: search, $options: "i" } }, { finishedProductName: { $regex: search, $options: "i" } }];
  if (finishedProductId) filter.finishedProductId = finishedProductId; if (status) filter.status = status; if (isDefault !== undefined) filter.isDefault = isDefault === "true";
  const skip = (Number(page) - 1) * Number(limit); const [data, total] = await Promise.all([populateList(BillOfMaterials.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)), BillOfMaterials.countDocuments(filter)]);
  res.json({ success: true, count: data.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data });
}
export async function getBomById(req, res) { const data = await populateDetail(BillOfMaterials.findById(req.params.id)).populate("createdBy", "firstName lastName"); if (!data) { res.status(404); throw new Error("BOM not found"); } res.json({ success: true, data }); }
export async function updateBom(req, res) {
  const bom = await BillOfMaterials.findById(req.params.id); if (!bom) { res.status(404); throw new Error("BOM not found"); }
  if (req.body.components) req.body.components = await enrichComponents(req.body.components);
  if (req.body.isDefault === true && req.body.finishedProductId) await BillOfMaterials.updateMany({ finishedProductId: req.body.finishedProductId, _id: { $ne: bom._id }, isDefault: true }, { $set: { isDefault: false } });
  Object.assign(bom, req.body); bom.updatedBy = req.user._id; await bom.save(); res.json({ success: true, data: bom });
}
export async function deleteBom(req, res) { const bom = await BillOfMaterials.findById(req.params.id); if (!bom) { res.status(404); throw new Error("BOM not found"); } bom.deletedAt = new Date(); bom.status = "archived"; await bom.save(); res.json({ success: true, message: "BOM archived" }); }
export async function checkMaterialAvailability(req, res) {
  const bom = await BillOfMaterials.findById(req.params.id).populate("components.productId", "name productCode"); if (!bom) { res.status(404); throw new Error("BOM not found"); }
  const targetQty = Number(req.query.quantity) || bom.outputQuantity; const batchMultiplier = targetQty / bom.outputQuantity; const components = [];
  for (const item of bom.components) { const needed = item.quantity * batchMultiplier * (1 + (item.wastagePercent || 0) / 100); const stock = await StockItem.find({ productId: item.productId }); const available = stock.reduce((sum, current) => sum + Math.max(0, current.quantities.onHand - current.quantities.reserved), 0); components.push({ productId: item.productId._id, productCode: item.productCode, productName: item.productName, required: +needed.toFixed(4), available: +available.toFixed(4), shortage: available < needed ? +(needed - available).toFixed(4) : 0, isSufficient: available >= needed, unitOfMeasure: item.unitOfMeasure }); }
  res.json({ success: true, data: { bomId: bom._id, targetQuantity: targetQty, batchMultiplier, canProduce: components.every((item) => item.isSufficient), components } });
}
