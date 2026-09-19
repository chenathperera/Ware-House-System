export const productTabs = [
  { id: "basic", label: "Basic Info" },
  { id: "variations", label: "Variations" },
  { id: "combo", label: "Combo Items" },
  { id: "pricing", label: "Pricing & Tax" },
  { id: "tiers", label: "Wholesale Tiers" },
  { id: "stock", label: "Stock & Packaging" },
  { id: "sales", label: "Sales Config" },
];

export function productFormDefaults() {
  return {
    type: "trading",
    status: "active",
    taxable: true,
    taxRate: 18,
    sellable: true,
    allowBackorder: false,
    minimumOrderQuantity: 1,
    productNature: "single",
    variations: [],
    comboItems: [],
    buyingPrice: 0,
    profitPercentage: 0,
    basePrice: 0,
    mrp: 0,
    callPrice: 0,
    tierPricing: [],
  };
}

export function hydrateProductForm(product) {
  if (!product) return productFormDefaults();
  const standardCost = product.costs?.standardCost || 0;
  return {
    name: product.name || "",
    shortName: product.shortName || "",
    sku: product.sku || "",
    barcode: product.barcode || "",
    productType: product.productType || "finished_good",
    canBeSold: product.canBeSold ?? true,
    canBePurchased: product.canBePurchased ?? true,
    canBeManufactured: product.canBeManufactured ?? false,
    description: product.description || "",
    categoryId: product.categoryId?._id || product.categoryId || "",
    brandId: product.brandId?._id || product.brandId || "",
    type: product.type || "trading",
    unitOfMeasure: product.unitOfMeasure || "",
    basePrice: product.basePrice || 0,
    mrp: product.mrp || 0,
    callPrice: product.callPrice || 0,
    taxable: product.tax?.taxable ?? true,
    taxRate: product.tax?.taxRate ?? 18,
    hsCode: product.tax?.hsCode || "",
    minimumLevel: product.stockLevels?.minimumLevel || 0,
    reorderLevel: product.stockLevels?.reorderLevel || 0,
    maximumLevel: product.stockLevels?.maximumLevel || 0,
    unitsPerCarton: product.packaging?.unitsPerCarton || 0,
    cartonsPerPallet: product.packaging?.cartonsPerPallet || 0,
    minimumOrderQuantity: product.salesConfig?.minimumOrderQuantity || 1,
    sellable: product.salesConfig?.sellable ?? true,
    allowBackorder: product.salesConfig?.allowBackorder ?? false,
    status: product.status || "active",
    buyingPrice: standardCost,
    profitPercentage:
      standardCost > 0 && product.basePrice
        ? (((product.basePrice - standardCost) / standardCost) * 100).toFixed(2)
        : 0,
    tierPricing: product.tierPricing || [],
    productNature: product.productNature || "single",
    variations: product.variations || [],
    comboItems:
      product.comboItems?.map((item) => ({
        productId: item.productId?._id || item.productId,
        quantity: item.quantity,
        priceContribution: item.priceContribution,
      })) || [],
    notes: product.notes || "",
  };
}

export function roundedPrice(buyingPrice, profitPercentage) {
  return Number((buyingPrice * (1 + profitPercentage / 100)).toFixed(2));
}
export function roundedProfit(buyingPrice, sellingPrice) {
  return buyingPrice > 0
    ? Number((((sellingPrice - buyingPrice) / buyingPrice) * 100).toFixed(2))
    : undefined;
}

export function toProductPayload(data, product) {
  return {
    name: data.name,
    shortName: data.shortName || undefined,
    sku: data.sku || undefined,
    barcode: data.barcode || undefined,
    productType: data.productType,
    canBeSold: data.canBeSold,
    canBePurchased: data.canBePurchased,
    canBeManufactured: data.canBeManufactured,
    description: data.description || undefined,
    categoryId: data.categoryId,
    brandId: data.brandId || undefined,
    type: data.type,
    unitOfMeasure: data.unitOfMeasure,
    basePrice: data.basePrice,
    purchasePrice: data.buyingPrice || 0,
    mrp: data.mrp || undefined,
    callPrice: data.callPrice || undefined,
    costs: { ...(product?.costs || {}), standardCost: data.buyingPrice || 0 },
    tax: { taxable: false, taxRate: 0 },
    stockLevels: {
      minimumLevel: data.minimumLevel || 0,
      reorderLevel: data.reorderLevel || 0,
      maximumLevel: data.maximumLevel || 0,
    },
    packaging: {
      unitsPerCarton: data.unitsPerCarton || 0,
      cartonsPerPallet: data.cartonsPerPallet || 0,
    },
    salesConfig: {
      minimumOrderQuantity: data.minimumOrderQuantity || 1,
      sellable: data.sellable,
      allowBackorder: data.allowBackorder,
    },
    status: data.status,
    notes: data.notes || undefined,
    tierPricing: data.tierPricing || [],
    productNature: data.productNature,
    variations: data.productNature === "variable" ? data.variations : [],
    comboItems: data.productNature === "combo" ? data.comboItems : [],
  };
}
