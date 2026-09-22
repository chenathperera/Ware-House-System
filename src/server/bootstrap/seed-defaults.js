import "server-only";
import UnitOfMeasure from "../models/UnitOfMeasure.js";
import Category from "../models/Category.js";
import CustomerGroup from "../models/CustomerGroup.js";
import Warehouse from "../models/Warehouse.js";
import Holiday from "../models/Holiday.js";

export const defaultUoms = [
  { name: "Piece", symbol: "pc", type: "count" },
  { name: "Box", symbol: "box", type: "count" },
  { name: "Carton", symbol: "ctn", type: "count" },
  { name: "Dozen", symbol: "dz", type: "count" },
  { name: "Pair", symbol: "pr", type: "count" },
  { name: "Kilogram", symbol: "kg", type: "weight" },
  { name: "Gram", symbol: "g", type: "weight" },
  { name: "Metric Ton", symbol: "MT", type: "weight" },
  { name: "Pound", symbol: "lb", type: "weight" },
  { name: "Liter", symbol: "L", type: "volume" },
  { name: "Milliliter", symbol: "ml", type: "volume" },
  { name: "Meter", symbol: "m", type: "length" },
  { name: "Centimeter", symbol: "cm", type: "length" },
  { name: "Foot", symbol: "ft", type: "length" },
  { name: "Square Meter", symbol: "sqm", type: "area" },
  { name: "Hour", symbol: "hr", type: "time" },
];

export const defaultCategories = [
  { name: "General", code: "GEN", type: "both", displayOrder: 1 },
  { name: "Food & Beverage", code: "FNB", type: "product", displayOrder: 2 },
  { name: "Electronics", code: "ELEC", type: "product", displayOrder: 3 },
  { name: "Textiles", code: "TEXT", type: "product", displayOrder: 4 },
  { name: "Chemicals", code: "CHEM", type: "both", displayOrder: 5 },
  { name: "Packaging Materials", code: "PKG", type: "raw_material", displayOrder: 6 },
];

export const defaultCustomerGroups = [
  {
    name: "Platinum",
    code: "PLAT",
    description: "Top-tier distributors with largest volumes",
    defaultPaymentTerms: { type: "credit", creditDays: 45, defaultCreditLimit: 1000000 },
    defaultDiscountPercent: 12,
    priority: 100,
    color: "#6366f1",
  },
  {
    name: "Gold",
    code: "GOLD",
    description: "Established wholesalers",
    defaultPaymentTerms: { type: "credit", creditDays: 30, defaultCreditLimit: 500000 },
    defaultDiscountPercent: 8,
    priority: 75,
    color: "#f59e0b",
  },
  {
    name: "Silver",
    code: "SILV",
    description: "Regular wholesale customers",
    defaultPaymentTerms: { type: "credit", creditDays: 15, defaultCreditLimit: 200000 },
    defaultDiscountPercent: 5,
    priority: 50,
    color: "#94a3b8",
  },
  {
    name: "Standard",
    code: "STD",
    description: "General customers, no credit terms",
    defaultPaymentTerms: { type: "cod", creditDays: 0, defaultCreditLimit: 0 },
    defaultDiscountPercent: 0,
    priority: 10,
    color: "#64748b",
  },
];

export const defaultWarehouse = {
  warehouseCode: "MAIN",
  name: "Main Warehouse",
  type: "main",
  address: {
    line1: "Configure address in settings",
    city: "Colombo",
    country: "Sri Lanka",
  },
  zones: [
    { code: "RCV", name: "Receiving Zone", type: "receiving" },
    { code: "STG", name: "Storage Zone", type: "storage" },
    { code: "DSP", name: "Dispatch Zone", type: "dispatch" },
  ],
  capabilities: { canShipDirectly: true, canReceiveGoods: true },
  isDefault: true,
  isActive: true,
};

export const defaultHolidays2026 = [
  ["Duruthu Full Moon Poya Day", "2026-01-03", "poya"],
  ["Tamil Thai Pongal Day", "2026-01-14", "religious"],
  ["Independence Day", "2026-02-04", "national"],
  ["Navam Full Moon Poya Day", "2026-02-01", "poya"],
  ["Mahasivarathri Day", "2026-02-15", "religious"],
  ["Medin Full Moon Poya Day", "2026-03-03", "poya"],
  ["Bak Full Moon Poya Day", "2026-04-01", "poya"],
  ["Day prior to Sinhala and Tamil New Year", "2026-04-13", "national"],
  ["Sinhala and Tamil New Year Day", "2026-04-14", "national"],
  ["Good Friday", "2026-04-03", "religious"],
  ["May Day (Labour Day)", "2026-05-01", "national"],
  ["Vesak Full Moon Poya Day", "2026-05-01", "poya"],
  ["Day following Vesak", "2026-05-02", "poya"],
  ["Poson Full Moon Poya Day", "2026-05-31", "poya"],
  ["Esala Full Moon Poya Day", "2026-06-29", "poya"],
  ["Nikini Full Moon Poya Day", "2026-07-29", "poya"],
  ["Binara Full Moon Poya Day", "2026-08-27", "poya"],
  ["Vap Full Moon Poya Day", "2026-09-26", "poya"],
  ["Deepavali", "2026-10-20", "religious"],
  ["Il Full Moon Poya Day", "2026-10-25", "poya"],
  ["Unduvap Full Moon Poya Day", "2026-11-24", "poya"],
  ["Christmas Day", "2026-12-25", "religious"],
].map(([name, date, type]) => ({ name, date: new Date(date), type, isActive: true }));

const seededCollections = [
  ["Units of Measure", UnitOfMeasure, defaultUoms, "insertMany"],
  ["default Categories", Category, defaultCategories, "insertMany"],
  ["Customer Groups", CustomerGroup, defaultCustomerGroups, "insertMany"],
  ["default Warehouse (MAIN)", Warehouse, defaultWarehouse, "create"],
  ["Sri Lanka holidays for 2026", Holiday, defaultHolidays2026, "insertMany"],
];

export async function seedDefaults({ collections = seededCollections, logger = console } = {}) {
  try {
    for (const [label, Model, defaults, operation] of collections) {
      if ((await Model.countDocuments()) === 0) {
        await Model[operation](defaults);
        const count = Array.isArray(defaults) ? `${defaults.length} ` : "";
        logger.log(`Seeded ${count}${label}`);
      }
    }
  } catch (error) {
    logger.error("Seed error:", error.message);
  }
}

const globalForSeedDefaults = globalThis;

export function initializeDefaultData() {
  if (!globalForSeedDefaults.__warehouseDefaultDataPromise) {
    globalForSeedDefaults.__warehouseDefaultDataPromise = seedDefaults().catch((error) => {
      globalForSeedDefaults.__warehouseDefaultDataPromise = null;
      throw error;
    });
  }
  return globalForSeedDefaults.__warehouseDefaultDataPromise;
}
