# Remaining original ERP module migration plan

**Planning-only, 2026-09-20.** The original MERN project is read-only authority. This document records source-derived dependencies; it does not authorize implementation.

## Current inventory

### Recovered Next scope

Auth/protected routes; users/roles/profile; settings; categories/brands/UOM/customer groups; customers; suppliers; products (including Product-owned minimal StockItem synchronization); warehouses; wholesale prices; price checker.

### Present but not migrated

Dashboard is **BLOCKED-BY-DEPENDENCIES**: original `dashboardController`/report hooks require transactional Sales, Invoice, Stock, Payments, Purchase and Production data. Receipt/Print is **BLOCKED-BY-INVOICES**: `ReceiptPrintPage` calls `invoicesApi.getById` and Bluetooth printing targets `/invoices/:id/print-json`.

### Remaining original modules (27)

1. Stock foundation: inventory overview, opening stock, movements, adjustments, transfers, reservations.
2. Purchase Orders.
3. GRN / goods receiving.
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
| Purchase Orders | Supplier, Product, Warehouse, User | Product/supplier/warehouse snapshotting; status workflow; GRN may validate lines and update received quantities/`grns`. | `purchaseOrderController.js`, PO model/validator/routes/pages. |
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

3. Purchase Orders.
4. GRN (requires PO optionally, but also supports direct receiving; must follow Stock).
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

- **Receipt/Print:** after Phase 3 Invoice, specifically `GET /invoices/:id` and the original `GET /invoices/:id/print-json` contract.
- **Dashboard:** after Phase 5 Reports and all data sources actually queried by `DashboardPage`/dashboard reports: sales/orders, invoice revenue/receivables, stock/low stock, payment/cash flow, purchase/GRN, production, and report aggregates.
