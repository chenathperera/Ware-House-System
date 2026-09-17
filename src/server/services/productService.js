import "server-only";
import Product from "../models/Product.js";
const populate = (query) =>
  query.populate("categoryId", "name code").populate("brandId", "name");
export const createProduct = async (req, res) => {
  const product = await Product.create({
    ...req.body,
    createdBy: req.user._id,
    ...(req.body.brandId ? {} : { brandId: undefined }),
  });
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
  const data = await populate(Product.findById(req.params.id));
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
  res.json({
    success: true,
    data: await populate(Product.findById(product._id)),
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
