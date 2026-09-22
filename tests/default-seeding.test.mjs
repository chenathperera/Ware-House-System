import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultCategories,
  defaultCustomerGroups,
  defaultHolidays2026,
  defaultUoms,
  defaultWarehouse,
  seedDefaults,
} from "../src/server/bootstrap/seed-defaults.js";

function collection(existing = []) {
  const records = structuredClone(existing);
  return {
    records,
    async countDocuments() {
      return records.length;
    },
    async insertMany(documents) {
      records.push(...structuredClone(documents));
    },
    async create(document) {
      records.push(structuredClone(document));
    },
  };
}

function seedCollections({ uoms = [], categories = [], groups = [], warehouses = [], holidays = [] } = {}) {
  return [
    ["Units of Measure", collection(uoms), defaultUoms, "insertMany"],
    ["default Categories", collection(categories), defaultCategories, "insertMany"],
    ["Customer Groups", collection(groups), defaultCustomerGroups, "insertMany"],
    ["default Warehouse (MAIN)", collection(warehouses), defaultWarehouse, "create"],
    ["Sri Lanka holidays for 2026", collection(holidays), defaultHolidays2026, "insertMany"],
  ];
}

const silentLogger = { log() {}, error() {} };

test("fresh database receives every source-backed default record", async () => {
  const collections = seedCollections();
  await seedDefaults({ collections, logger: silentLogger });

  const uoms = collections[0][1];
  const categories = collections[1][1];
  const groups = collections[2][1];
  const warehouses = collections[3][1];
  const holidays = collections[4][1];
  assert.deepEqual(uoms.records, defaultUoms);
  assert.deepEqual(categories.records, defaultCategories);
  assert.deepEqual(groups.records, defaultCustomerGroups);
  assert.deepEqual(warehouses.records, [defaultWarehouse]);
  assert.deepEqual(holidays.records, defaultHolidays2026);
  assert.equal(uoms.records.length, 16);
  assert.equal(holidays.records.length, 22);
});

test("default initialization is idempotent after a successful fresh install", async () => {
  const collections = seedCollections();
  await seedDefaults({ collections, logger: silentLogger });
  const before = collections.map(([, Model]) => structuredClone(Model.records));

  await seedDefaults({ collections, logger: silentLogger });

  assert.deepEqual(
    collections.map(([, Model]) => Model.records),
    before,
  );
});

test("non-empty source collections are preserved without adding or overwriting defaults", async () => {
  const existing = {
    name: "User-created UOM",
    symbol: "usr",
    type: "count",
    isActive: false,
  };
  const collections = seedCollections({ uoms: [existing] });
  await seedDefaults({ collections, logger: silentLogger });

  assert.deepEqual(collections[0][1].records, [existing]);
  assert.equal(collections[1][1].records.length, defaultCategories.length);
  assert.equal(collections[2][1].records.length, defaultCustomerGroups.length);
  assert.equal(collections[3][1].records.length, 1);
  assert.equal(collections[4][1].records.length, defaultHolidays2026.length);
});
