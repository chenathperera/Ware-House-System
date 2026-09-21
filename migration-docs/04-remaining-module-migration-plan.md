# Remaining original ERP module migration plan

**Planning-only, 2026-09-20.** The original MERN project is read-only authority. This document records source-derived dependencies; it does not authorize implementation.

## Current inventory

### Recovered Next scope

Auth/protected routes; users/roles/profile; settings; categories/brands/UOM/customer groups; customers; suppliers; products (including Product-owned minimal StockItem synchronization); warehouses; wholesale prices; price checker; Purchase Orders (verified).

### Present but not migrated

Dashboard is **BLOCKED-BY-DEPENDENCIES**: original `dashboardController`/report hooks require transactional Sales, Invoice, Stock, Payments, Purchase and Production data. Receipt/Print is **BLOCKED-BY-INVOICES**: `ReceiptPrintPage` calls `invoicesApi.getById` and Bluetooth printing targets `/invoices/:id/print-json`.

### Remaining original modules (27)

1. Stock foundation: inventory overview, opening stock, movements, adjustments, transfers, reservations.
2. GRN / goods receiving.
4. Bills.
5. Supplier returns.
6. Supplier payments, cheques, bank accounts, fund transfers and expenses.
7. Sales Orders.
8. Invoices and Receipt/Print unlock.
9. Customer returns and credit notes.
10. Customer payments and POS/POS sessions.
11. Damages.
12. BOM.
13. Production orders.
14. Repairs.
15. HR foundation: departments, designations, employees, shifts, attendance, leave, holidays, salary structures, payroll/payslips.
16. Reports and Dashboard unlock.

## Dependency graph and workflow evidence

| Module | Actual dependencies | Downstream / side effects | Source evidence |
| --- | --- | --- | --- |
| Stock foundation | Product, Warehouse, User; `StockItem`, `StockMovement`, `StockReservation`, `stockService` | Transactional increase/decrease creates immutable movements; inventory, opening, adjustment, transfer and reservation APIs; prerequisite for GRN, sales, returns, damage and production. | `stockController.js`, `stockService.js`, stock models/routes/pages. |
| Purchase Orders | Supplier, Product, Warehouse, User | **COMPLETE — 2026-09-21.** Product/supplier/warehouse snapshots, status workflow, soft delete, and the future GRN data boundary are verified. GRN remains unstarted. | `purchaseOrderController.js`, PO model/validator/routes/pages. |
| GRN | Stock, Product, Warehouse, Supplier; optional Purchase Order | Mongo transaction creates GRN, increases stock with purchase cost/batch, writes movement, links movement, increments PO lines and appends `grns`. | `grnController.js`. |
| Bills | GRN, Supplier, Purchase Order | Bill/GRN financial matching, supplier payable/balance workflow; prerequisite for supplier payment reporting. | bill model/controller/validator/pages. |
| Supplier returns | Stock, GRN, Supplier, Product | Reduces returned stock and records supplier-return/GRN workflow. | supplier-return controller/model/pages. |
| Sales Orders | Customer, Product, Warehouse, Stock | Product/customer snapshots and credit checks; approval deducts stock; cancellation attempts stock restoration; status workflow. | `salesOrderController.js`. |
| Invoices | Sales Order, Customer, Product, Stock, Payment | Invoice creation/status, customer balance/credit effects, stock handling and print JSON endpoint; unblocks receipt. | invoice model/controller/validator/routes/pages; `ReceiptPrintPage.jsx`. |
| Customer returns / Credit notes | Invoice, Customer, Stock | Return line workflow restores/changes stock and credit note affects invoice/customer financial state. | customer-return and credit-note controllers/models/pages. |
| Payments / POS | Invoice, Customer, Supplier, bank/cheque records | Allocations change receivables/payables; POS session creates/settles invoices; depends on Invoice and payment contracts. | payment/pos-session controllers/models/pages. |
| Bank accounts / transfers / expenses / cheques | User; payments where linked | Cash/bank ledger workflows and financial reporting inputs. | bank/fund-transfer/expense/cheque controllers/models/pages. |
| Damages | Stock, Product, Warehouse | Stock decrease plus damage record/movement. | damage controller/model/page. |
| BOM | Product | Defines component requirements; prerequisite for production. | bom controller/model/validator/pages. |
| Production orders | BOM, Product, Warehouse, Stock | Consumes component stock and creates finished-goods stock/movements; production status workflow. | production-order controller/model/validator/pages. |
| Repairs | Customer, Product, User | Independent repair-order lifecycle; may reference sales/customer products but no stock service dependency established in controller imports. | repair-order controller/model/pages. |
| HR / payroll | User; Employee, Department, Designation, Shift; Attendance, Leave, Holiday, SalaryStructure | Payroll consumes employee/attendance/leave/salary inputs; HR reports consume all. | `hrController.js`, `payrollController.js`, HR models/routes/pages. |
| Reports / Dashboard | Stock, Sales Orders, Invoices, Payments, Purchase/GRN/Bills, Production, HR | Read-only aggregate/report endpoints; Dashboard uses KPI, revenue, top-product and top-customer report hooks. | reports controllers/routes/pages; `DashboardPage.jsx`, `dashboardController.js`. |

## Dependency-safe migration order

### Phase 1 — inventory transaction foundation

1. **Stock foundation** (overview, movements, opening stock, adjustments, transfers, reservations).
2. Damages (reuses stock decrease/movement contract).

### Phase 2 — purchasing and supplier liability

3. GRN (requires PO optionally, but also supports direct receiving; must follow Stock). Purchase Orders are complete and GRN is not started by this checkpoint.
5. Bills.
6. Supplier Returns.
7. Bank Accounts, Supplier Payments, Cheques, Fund Transfers and Expenses (migrate bank account first within this group, then payments/cheques/transfers/expenses).

### Phase 3 — sales and customer receivables

8. Sales Orders (requires Stock for approval deduction).
9. Invoices.
10. Receipt/Print (unblocked immediately after Invoice API and print JSON parity).
11. Customer Returns.
12. Credit Notes.
13. Customer Payments, then POS Sessions/POS.

### Phase 4 — manufacturing and service

14. BOM.
15. Production Orders.
16. Repairs.

### Phase 5 — HR and analytics

17. HR master data (Department, Designation, Employee, Shift).
18. Attendance, Leave Requests, Holidays, Salary Structures.
19. Payroll / Payslips.
20. Reports, then Dashboard (Dashboard is only restored after its actual report/data sources exist).

## First next module: Stock foundation

Stock must come first because original `stockController` owns the only shared increase/decrease/movement/reservation contract. GRN calls `increaseStock`; Sales Orders call `decreaseStock` on approval and `increaseStock` on cancellation; damages, returns and production use the same stock side effects. Product's existing StockItem sync is intentionally insufficient: it creates/synchronizes a default item but does not provide stock APIs, movement audit trails, transactions, reservations, or workflow validation.

### Exact original scope

- **Models:** `StockItem`, `StockMovement`, `StockReservation` (the current minimal Product dependency model must be compared and expanded only to original scope).
- **Backend:** `stockController.js`, `stockService.js`, `stockRoutes.js`; no substitute transaction semantics.
- **Routes:** list stock, by-product stock, movements, opening, transfer, adjustment and reservations, with original role guards.
- **Frontend:** `StockPage`, `OpeningStockPage`, `StockMovementsPage`, `StockAdjustmentPage`, `StockTransferPage`, their feature API/hooks/forms and original filters/pagination/loading/empty/error states.
- **Workflows:** Mongo transactions for opening, transfer and adjustment; preserve movement types, batch/source document fields, cost/valuation and negative-stock behavior exactly.
- **Authorization:** preserve original `stockRoutes` roles per read/write endpoint.

### Minimum safe checkpoints

1. **Data and stock service:** exact models, indexes/hooks, `increaseStock`/`decreaseStock`, movement/reservation contracts, isolated side-effect tests.
2. **Stock read/audit surfaces:** list/by-product/movement/reservation API plus Stock Overview and Movements UI, filters/pagination/auth tests.
3. **Transactional operations:** opening stock, adjustment and transfer routes/forms with rollback, movement and valuation parity tests.
4. **Full parity regression:** original flow tests, all stock pages, lint/build/diff; only then begin a dependent module.

## Unlock points

## Damages migration — 2026-09-21

- Model, controller contract, routes, frontend register, API/hooks and sidebar route: **COMPLETE**.
- Stock integration: **PARITY** — creation decreases Stock only when `adjustStock` is truthy; the movement is `damage` with source document `damage_record`.
- Write-off: **PARITY** — admin/manager only; stamps approval and write-off value without a second stock decrease.
- Reads/summary: **PARITY** — source/product/warehouse/disposition/date pagination, populated list/detail, and per-source aggregate restored.
- Tests: **PASS** — backend/API/transaction 6/6; frontend 1/1.
- DAMAGES GATE: **GREEN**.

## Purchase Orders verification — 2026-09-21

- **BACKEND: COMPLETE.** The model/data contract preserves generated `PO-<sequence>` numbers through `Counter`, supplier/warehouse/product snapshots, line and order calculations, receiving fields, and the persisted future-GRN reference boundary without Stock mutation.
- **API: COMPLETE.** Source-backed create/update validation, read access, role authorization, list filters/pagination/population, detail behavior, editable `draft`/`pending_approval` restrictions, update recalculation, approve/sent/cancel/close lifecycle transitions, and draft-only soft delete are verified.
- **FRONTEND: COMPLETE.** The data layer preserves original endpoints, query keys, detail enablement, previous data, mutation feedback, and invalidation. The register preserves filters/pagination, role/status action visibility, table states, and receipt progress. Create/edit preserve header and line fields, product defaults, calculations, validation, hydration, and payloads. Detail preserves snapshots, amounts, receipt progress, status actions, confirmations, and feedback.
- **Parity defects fixed during verification:** detail no longer throws while the GRN model is not yet migrated (and still populates GRNs when registered); original create/update Zod validation restored; update-time product snapshot enrichment restored; register receipt-progress bar restored; create/draft controls disabled until supplier, warehouse, and one line are present; delivery address, other charges, and shipping terms restored on detail.
- **PO suites: PASS.** Backend/API 11/11; frontend 4/4.
- **Cross-module regression evidence:** stock service 1/1, stock API/rollback 7/7 (isolated replica set), and stock frontend 3/3; damages backend/API 6/6 and frontend 1/1; supplier backend 8/8 and frontend 4/4; product backend 9/9, page/data 3/3, and form/modal 4/4; warehouse backend 11/11 and frontend 2/2.
- **Engineering checks:** `npm run lint` passed with 0 errors and 0 warnings; `npm run build` passed; `git diff --check` passed with no whitespace errors.
- **Final gate status:** **GREEN.** The stale Stock frontend static-text assertion now accepts JSX whitespace while still verifying the original “Enter Opening Stock” action. Purchase Orders are complete, and GRN remains unstarted.

- **Receipt/Print:** after Phase 3 Invoice, specifically `GET /invoices/:id` and the original `GET /invoices/:id/print-json` contract.
- **Dashboard:** after Phase 5 Reports and all data sources actually queried by `DashboardPage`/dashboard reports: sales/orders, invoice revenue/receivables, stock/low stock, payment/cash flow, purchase/GRN, production, and report aggregates.

## Stock Foundation backend checkpoint — 2026-09-20

- Models: **COMPLETE** — existing `StockItem` parity retained; `StockMovement` and `StockReservation` restored.
- Core service: **COMPLETE** — original increase/decrease, weighted cost, audit movement, reserve/release/fulfill and availability semantics retained with optional session propagation.
- Backend API service and route handlers: **COMPLETE** — `GET /stock`, `GET /stock/movements`, `GET /stock/by-product/:productId`, `POST /stock/opening`, `POST /stock/adjustment`, `POST /stock/transfer`, and `GET /stock/reservations` are restored through App Router handlers.
- Authorization: **COMPLETE** — all read routes authenticate; only opening/adjustment/transfer authorize `admin`, `manager`, `warehouse_staff` exactly as original `stockRoutes`.
- Validator behavior: **COMPLETE** — original has no Stock validator middleware; controller-level body checks and service validation are intentionally preserved.
- Backend transaction parity: **PARITY** — opening, adjustment and transfer retain original `startSession`, `withTransaction`, service ordering and `finally session.endSession` shape. `tests/stock-api.test.mjs` runs against an isolated single-node replica set and proves rollback after a prior item has completed for all three workflows.
- Backend tests: **PASS** — stock service 1/1; source-derived API, authorization, read/filter/population, success/error, audit, valuation, and rollback suite 7/7. The API suite's transaction URI is explicit and allow-listed in the test so the ordinary standalone developer database is never mistaken for a rollback-capable environment.
- Product regression: **PASS** — 9/9.
- Warehouse regression: **PASS** — 11/11.
- Final verification: **PASS** — `npm run lint` completed with 0 errors (7 pre-existing warnings), `npm run build` compiled the production app successfully, and `git diff --check` reported no whitespace errors.
- Stock backend gate: **GREEN** — models, core service, backend API service, route handlers, authorization and transaction semantics are source-tested.
- Stock frontend data layer: **PARITY** — original API methods, query keys, `placeholderData`, enabled source-stock queries, mutations, toast success/failure semantics and stock/movement invalidation restored.
- Stock Overview: **PARITY** — original summary strip, filters, status logic, table, pagination, loading/empty behavior and write-action role visibility restored at `/stock`.
- Stock Movements: **PARITY** — original audit columns, direction/type display, warehouse/type filters, pagination and empty/loading states restored at `/stock/movements`.
- Opening Stock: **PARITY** — original warehouse/product lines, auto-cost fill, totals, validation, notes, mutation/navigation flow restored at `/stock/opening`.
- Stock Adjustment: **PARITY** — original restricted front-end visibility, admin verification flow, selected warehouse stock, reasons, negative preview and mutation flow restored at `/stock/adjustment`.
- Stock Transfer: **PARITY** — original source-stock query, available-only product selection, quantity preview, same-warehouse validation and atomic transfer mutation restored at `/stock/transfer`.
- Stock frontend tests: **PASS** — 3/3 source-derived data-layer/page/form workflow checks.
- Stock full regression: **PASS** — stock service 1/1, stock API/rollback 7/7, product backend 9/9, warehouse backend 11/11, stock frontend 3/3; prior product and warehouse frontend parity suites remain green.
- Overall Stock Foundation gate: **GREEN** — no Stock blockers remain. This unlocks downstream Damages, Purchase Orders, GRN, Sales Orders, Invoice, returns and Production in dependency order; none are started by this checkpoint.
# GRN backend/data checkpoint (2026-09-21)

Status: backend/data parity implemented; frontend intentionally remains unmigrated.

- Source contract: `GoodsReceiptNote` receives goods on `POST /grns` in a MongoDB transaction. The only source endpoints are list, detail, create, and cancellation through `DELETE /grns/:id`.
- Data/Counter: GRNs use `GRN-<sequence>` from Counter key `grn`; the model preserves source line snapshots, receipts, discounts, quality fields, totals, audit fields, indexes, and `deletedAt` find middleware.
- Validation/auth: source Zod contract and role matrix are preserved: authenticated reads; `admin`, `manager`, and `warehouse_staff` create; `admin` and `manager` cancel.
- PO/Stock: receive appends the GRN to the PO, adds accepted quantity to its referenced PO lines, lets the PO hook recalculate pending/line/status/completion fields, updates warehouse/batch stock through the migrated stock service, creates `purchase_receipt` movements, and applies weighted-average/product purchase costing.
- Partial/full receipt: multiple GRNs accumulate accepted quantity. The PO save hook moves `approved`/`sent`/`partially_received` POs to `partially_received` then `fully_received` exactly as the source does.
- Rollback: dedicated replica-set API coverage proves a stock/product failure rolls back the GRN, PO, stock, and movements.
- Preserved source quirks: source validation drops line `freeQuantity`, `discountPercent`, `discountAmount`, and `damagedQuantity` despite the model/controller accepting them; it does not enforce PO line membership or over-receipt. The source cancellation path is internally invalid: its StockMovement enum rejects `grn_cancellation`, and its GRN status enum omits `cancelled` (as do its cancellation audit schema fields). Cancellation therefore returns 400 and transaction rollback retains the received GRN, PO, and stock unchanged.
- Test evidence: `npm run test:grns-api` with `MONGODB_URI=mongodb://127.0.0.1:27018/warehouse_system_grn_test?replicaSet=stockTestRs` covers authorization, validation, counter, snapshots, partial/full receiving, PO/stock/movement/cost results, reads, soft delete, and failure rollback.
- Regression/build evidence: PO API (11), Stock service (1), Stock API (7, against its replica set), Supplier (8), Product (9), and Warehouse (11) pass. GRN-scoped and repository-wide ESLint pass with 0 errors and 0 warnings; production build and `git diff --check` pass. The transfer-line reset was moved into the source-warehouse change handler, and the asynchronous PO edit-form hydration retains a narrowly scoped lint rationale without changing its behavior.
- Final gate status: **GREEN.** GRN backend/data parity is verified; frontend parity remains intentionally unstarted.

## GRN frontend parity checkpoint (2026-09-21)

- **Data layer:** `/api/grns` list/detail/create/cancel mappings, source query keys, detail enablement, previous list data, invalidation, and source feedback are implemented.
- **Register:** `/grns` restores the source title, search, columns, badges, loading/empty states, pagination, direct-GRN action, and cancellation confirmation. The original register exposes cancellation for every non-cancelled record; backend authorization and its source-backed cancellation failure remain authoritative.
- **Receiving:** direct receipt restores supplier/warehouse/product selection, quantity, price, free quantity, line/bill discount fields and displayed totals. PO receipt restores the source PO-driven supplier/warehouse and pending-line hydration, delivery/invoice/transport references, received/rejected/accepted, batch/expiry, discounts, and notes.
- **PO integration:** source Receive Goods visibility (`admin`, `manager`, `warehouse_staff`; `approved`, `sent`, `partially_received`) is restored on PO detail. No Bills work was started.
- **Validation/quirks:** source client validation and calculations are preserved; it does not add over-receipt prevention. The verified backend strips source-unsupported line fields and cancellation returns its intentional source 400, which the UI reports as cancellation failure.
- **Tests:** GRN backend/API 7/7; GRN frontend 5/5; PO backend/API 11/11; Stock service 1/1; Stock API/rollback 7/7; Stock frontend 3/3. Full lint is clean, production build passes, and `git diff --check` passes.
- **Final GRN gate:** **GREEN.**
