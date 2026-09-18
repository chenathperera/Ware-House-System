import "server-only";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import "../models/Warehouse.js";
import "../models/StockItem.js";

const populate = (query) =>
  query.populate("categoryId", "name code").populate("brandId", "name");

export const createProduct = async (req, res) => {
  const product = await Product.create({
    ...req.body,
    createdBy: req.user._id,
  });

  // The original creates a zero-stock record in the default warehouse, or
  // the first warehouse. Its failure is deliberately logged and does not
  // roll back the Product create.
  try {
    const Warehouse = mongoose.model("Warehouse");
    const StockItem = mongoose.model("StockItem");
    const defaultWh =
      (await Warehouse.findOne({ isDefault: true })) || (await Warehouse.findOne());

    if (defaultWh) {
      await StockItem.create({
        productId: product._id,
        warehouseId: defaultWh._id,
        productCode: product.productCode,
        productName: product.name,
        unitOfMeasure: product.unitOfMeasure,
        quantities: { onHand: 0, reserved: 0 },
        totalValue: 0,
      });
    }
  } catch (err) {
    console.error("Initial stock record creation failed:", err);
  }

  const data = await populate(Product.findById(product._id));
  res.status(201).json({ success: true, data });
};
export const getProducts = async (req, res) => {
  const {
    search,
    categoryId,
    brandId,
    status,
    type,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;
  const filter = {};
  if (search)
    filter.$or = ["name", "shortName", "productCode", "sku", "barcode"].map(
      (field) => ({ [field]: { $regex: search, $options: "i" } }),
    );
  if (categoryId) filter.categoryId = categoryId;
  if (brandId) filter.brandId = brandId;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (minPrice || maxPrice)
    filter.basePrice = {
      ...(minPrice ? { $gte: Number(minPrice) } : {}),
      ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
    };
  const [data, total] = await Promise.all([
    populate(Product.find(filter))
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    count: data.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data,
  });
};
export const getProductById = async (req, res) => {
  const data = await populate(Product.findById(req.params.id))
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName");
  if (!data) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, data });
};
export const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  Object.assign(product, req.body);
  product.updatedBy = req.user._id;
  await product.save();

  const data = await populate(Product.findById(product._id));

  // Keep Product-denormalized fields in existing StockItems synchronized.
  // As in the original controller, a stock sync error is swallowed after
  // logging, so the already-saved Product update remains successful.
  try {
    const StockItem = mongoose.model("StockItem");
    await StockItem.updateMany(
      { productId: data._id },
      {
        productName: data.name,
        productCode: data.productCode,
        unitOfMeasure: data.unitOfMeasure,
      },
    );
  } catch (err) {
    console.error("StockItem sync failed:", err);
  }

  res.json({
    success: true,
    data,
  });
};
export const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.deletedAt = new Date();
  product.status = "inactive";
  await product.save();
  res.json({ success: true, message: "Product deleted" });
};
