# Fresh-install default-data parity

## Original behavior

The original Express server invokes `connectDB().then(() => seedDefaults())` before it creates and starts the HTTP listener. It does not await the seeding promise before `app.listen`; `seedDefaults` catches and logs its own errors, so a seed failure does not stop startup.

`seedDefaults` checks each collection with `countDocuments()` and creates data only when that collection is completely empty. It never individually fills missing records, clears a collection, updates existing data, or uses transactions. The ordered source sequence is UOMs, categories, customer groups, warehouse, default user, then holidays. Mongoose schema defaults and timestamps are applied by the original `insertMany`/`create` calls.

| Entity | Condition | Source records |
| --- | --- | --- |
| `UnitOfMeasure` | Count is zero | 16: Piece/`pc`, Box/`box`, Carton/`ctn`, Dozen/`dz`, Pair/`pr`, Kilogram/`kg`, Gram/`g`, Metric Ton/`MT`, Pound/`lb`, Liter/`L`, Milliliter/`ml`, Meter/`m`, Centimeter/`cm`, Foot/`ft`, Square Meter/`sqm`, Hour/`hr`; their exact types are retained in `seed-defaults.js`. |
| `Category` | Count is zero | General (`GEN`), Food & Beverage (`FNB`), Electronics (`ELEC`), Textiles (`TEXT`), Chemicals (`CHEM`), Packaging Materials (`PKG`), with original type/display-order values. |
| `CustomerGroup` | Count is zero | Platinum, Gold, Silver, Standard with the original descriptions, credit terms, discounts, priorities, and colours. |
| `Warehouse` | Count is zero | One active default `MAIN` warehouse, address, receiving/storage/dispatch zones, and capabilities. |
| `Holiday` | Count is zero | 22 active Sri Lankan 2026 holidays with exact source names, dates, and types. |
| `User` | Count is zero | The original creates a hard-coded admin. This migration deliberately does not reproduce credentials: the verified migration contract instead makes the first registered user admin. |

## Migrated mechanism

`apiHandler` connects to MongoDB and awaits `initializeDefaultData()` before applying request authorization and invoking an ERP service. The initializer stores one promise on `globalThis`, so concurrent requests in a Next.js process share one seed run rather than race or duplicate inserts. The source collection-empty checks and source order are retained. As in the original, seed failures are logged and do not stop normal request handling.

The initializer contains no UOM UI, route, sidebar item, or Product-form change. An authenticated `GET /api/uoms` now sees the seeded source records, and the existing Product reference query (`productsApi.listUoms`) continues to supply its Unit of Measure dropdown.

## Auth preservation

The original default-admin credentials are intentionally not migrated. `POST /api/auth/register` remains public only when `User.countDocuments()` is zero, makes that user admin, and requires an authenticated admin for later registrations. Default seeding does not create or modify users.

## Verification

`tests/default-seeding.test.mjs` verifies fresh data, exact source defaults, idempotency, and preservation of a non-empty user-created collection. Existing UOM and Product backend/frontend regression suites verify the UOM API and Product consumer contract.

Final verification on 2026-09-22 passed: default-seeding 3/3, UOM API 10/10 (including all 16 source UOM records returned through authenticated `GET /api/uoms` after initialization), Product backend 9/9, Product page/data 3/3, and Product modal 4/4. Lint completed with zero errors, production build passed, and `git diff --check` passed. The first-user auth contract remains unchanged; its shared-database suite was deliberately not run because it refuses to mutate a database that already contains a user.
