# Structural audit — original MERN ERP

Audit date: 2026-09-16. Scope: static structural inspection for the confirmed complete Option B conversion to Next.js App Router and Route Handlers, retaining MongoDB/Mongoose and existing UI and business behaviour.

Only this report is created in the working project. Ware-House-System-main remains read-only. No application code, environment files, dependencies, database records, or Git commits were created or changed. No application, seed, maintenance script, or database connection was run. Real .env files were not read; only example variable names and source references were inspected. Excluded: dependency trees, Git internals, build/dist, coverage, logs, generated/temporary output, uploaded media and lockfile contents.

Source paths below are relative to Ware-House-System-main. This is a structural inventory, not a certification of business-logic equivalence. Suspected defects are recorded for later characterization, not silently corrected.

## 1. Current architecture

The root launches two independent ECMAScript-module packages: a browser-only React/Vite SPA and an Express JSON API. React pages and feature hooks call Axios with a bearer JWT; Express routes apply authentication and optional Zod validation; controllers use Mongoose directly and optionally shared services. There is no general repository/service abstraction. Mongoose hooks also perform material calculations and database operations.

The backend entry point loads dotenv, connects to MongoDB, runs default seeding after connection, and starts its HTTP listener. Listening is not explicitly gated on seeding completion. Global middleware comprises Helmet, permissive reflected-origin CORS with credentials, JSON and URL-encoded bodies capped at 10 MB, development Morgan logging, auth rate limiting, and not-found/error handling. The limiter applies to the entire /api/auth mount: 100 requests per 15 minutes, not just login.

The frontend entry point installs browser-error suppression, React StrictMode, BrowserRouter, QueryClientProvider and Toaster. React Query disables window-focus refetching, uses five-minute stale time and one retry except for 401/403. Feature folders contain API wrappers, query/mutation hooks, forms and selected client Zod schemas; some pages call Axios directly.

| Area | Inventory |
| --- | --- |
| Frontend | 182 source files; 89 page components; 91 route declarations |
| Backend | 34 route modules; 220 router method/path entries plus GET /api/health |
| Persistence/business | 41 models; 40 controllers; 2 services; 2 utils |
| Supporting backend | 1 config; 3 middleware; 11 validators |

### Packages and scripts

Versions below are declared ranges, not verified installed or lockfile resolutions.

**[package.json](../../Ware-House-System-main/package.json)**

| Kind | Declarations |
| --- | --- |
| Scripts | postinstall: npm install --prefix backend && npm install --prefix frontend; start: concurrently "npm start --prefix backend" "npm start --prefix frontend" |
| Dependencies | None |
| Dev dependencies | concurrently ^8.2.2 |

**[frontend/package.json](../../Ware-House-System-main/frontend/package.json)**

| Kind | Declarations |
| --- | --- |
| Scripts | start: vite; dev: vite; build: vite build; lint: eslint .; preview: vite preview |
| Dependencies | @hookform/resolvers ^5.2.2; @tanstack/react-query ^5.99.2; axios ^1.15.0; lucide-react ^1.8.0; react ^19.2.4; react-dom ^19.2.4; react-hook-form ^7.72.1; react-hot-toast ^2.6.0; react-router-dom ^7.14.1; recharts ^3.8.1; zod ^4.3.6; zustand ^5.0.12 |
| Dev dependencies | @eslint/js ^9.39.4; @types/react ^19.2.14; @types/react-dom ^19.2.3; @vitejs/plugin-react ^6.0.1; autoprefixer ^10.5.0; eslint ^9.39.4; eslint-plugin-react-hooks ^7.0.1; eslint-plugin-react-refresh ^0.5.2; globals ^17.4.0; postcss ^8.5.10; tailwindcss ^3.4.19; vite ^8.0.4 |

**[backend/package.json](../../Ware-House-System-main/backend/package.json)**

| Kind | Declarations |
| --- | --- |
| Scripts | start: node src/server.js; dev: nodemon src/server.js |
| Dependencies | bcryptjs ^3.0.3; cors ^2.8.6; dotenv ^17.4.2; express ^5.2.1; express-async-handler ^1.2.0; express-rate-limit ^8.3.2; helmet ^8.1.0; jsonwebtoken ^9.0.3; mongoose ^9.4.1; morgan ^1.10.1; zod ^4.3.6 |
| Dev dependencies | nodemon ^3.1.14 |

Root postinstall installs both child packages; root start uses concurrently. run_project.bat checks dependency folders, installs missing packages, then starts the application. test-login.js is an ad hoc Axios login probe with embedded credentials (values omitted); it is not wired into npm scripts. Root has no declared automated test command.

Frontend script_add_view.cjs and script_fix_view.cjs rewrite page files; they are not runtime/migration commands and were not executed. Backend contains ad hoc admin/setup/stock/check/test scripts outside src; these are not an isolated test suite and must not be run against the original configuration. Scratch files and saved script output were excluded.

Root README contains only a project heading. Frontend README is Vite template guidance, not an ERP specification.

### Frontend configuration, assets and layout

- vite.config.js: React plugin, ES2020 build target, Chrome 80 CSS target; no API proxy configured.
- tailwind.config.js: v3 content scanning over index and source, extended primary palette. postcss.config.js: Tailwind and Autoprefixer.
- eslint.config.js: flat JS/React hooks/refresh rules, browser globals, dist exclusion and custom unused-variable rule.
- index.html: RC Traders title, SVG favicon, root element and module entry.
- frontend/public contains _redirects (SPA fallback to index.html), favicon.svg and icons.svg. The fallback must not intercept Next API routes.
- src/assets contains React and Vite SVGs. index.css includes print rules; App.css is present.
- components/ui: Badge, Button, Card, ConfirmDialog, EmptyState, Input, KpiCard, Modal, PageHeader, Pagination, Select, Table and Textarea.
- components/layout: active AppLayout, Header and Sidebar plus copy variants. App.jsx imports the unsuffixed AppLayout; copy files are not automatically authoritative.
- components/print: PrintableInvoice and ThermalReceipt. hooks/useMobile.js, utils/printHelpers.js, api/axios.js and store/authStore.js provide shared browser behaviour.

| Feature directory | Files |
| --- | --- |
| auth | AdminVerificationModal.jsx, authApi.js, authSchemas.js, useAdminVerify.js |
| bills | billsApi.js, useBills.js |
| boms | bomsApi.js, useBoms.js |
| customers | CustomerFormModal.jsx, QuickCreateCustomerModal.jsx, customerSchemas.js, customersApi.js, useCustomers.js |
| expenses | ExpenseFormModal.jsx, expensesApi.js |
| hr | hrApi.js, useHr.js |
| invoices | invoicesApi.js, useInvoices.js |
| payments | paymentsApi.js, usePayments.js |
| posSessions | CloseRegisterModal.jsx, PosSessionModal.jsx, posSessionsApi.js |
| production | CompleteProductionModal.jsx, productionApi.js, useProduction.js |
| products | ProductFormModal.jsx, QuickCreateProductModal.jsx, productSchemas.js, productsApi.js, useProducts.js |
| purchaseOrders | GrnModal.jsx, purchaseOrdersApi.js, usePurchaseOrders.js |
| reports | financialReportsApi.js, reportsApi.js, useReports.js |
| returns | returnsApi.js, useReturns.js |
| salesOrders | salesOrdersApi.js, useSalesOrders.js |
| settings | settingsApi.js, useSettings.js |
| stock | stockApi.js, useStock.js |
| suppliers | QuickCreateSupplierModal.jsx, SupplierFormModal.jsx, supplierSchemas.js, suppliersApi.js, useSuppliers.js |
| users | UserFormModal.jsx, roleConfig.js, useUsers.js, usersApi.js |
| warehouses | WarehouseFormModal.jsx, useWarehouses.js, warehouseSchemas.js, warehousesApi.js |

## 2. All frontend pages and routes

Source: frontend/src/App.jsx. Paths use React Router syntax; named parameters need App Router dynamic segments later. “ERP” means the common ProtectedRoute and AppLayout for admin, manager, accountant, sales_manager, sales_rep, warehouse_staff, production_staff, inventory_admin and staff. Most pages have no narrower route guard; buttons and API permissions may still be narrower.

| Path | Page under frontend/src | Route access/layout |
| --- | --- | --- |
| /login | pages/LoginPage.jsx | Public; outside AppLayout |
| /unauthorized | pages/UnauthorizedPage.jsx | Public; outside AppLayout |
| /receipt/:id | pages/ReceiptPrintPage.jsx | ERP roles; standalone |
| /price-checker | pages/PriceCheckerPage.jsx | customer, admin, manager, inventory_admin, staff; standalone |
| / | pages/DashboardPage.jsx | ERP |
| /dashboard | pages/DashboardPage.jsx | ERP |
| /products | pages/ProductsPage.jsx | ERP |
| /wholesale-prices | pages/WholesalePricesPage.jsx | ERP |
| /categories | pages/CategoriesPage.jsx | ERP |
| /brands | pages/BrandsPage.jsx | ERP |
| /customers | pages/CustomersPage.jsx | ERP |
| /customer-groups | pages/CustomerGroupsPage.jsx | ERP |
| /sales-orders | pages/SalesOrdersPage.jsx | ERP |
| /sales-orders/new | pages/SalesOrderFormPage.jsx | ERP |
| /sales-orders/:id | pages/SalesOrderDetailPage.jsx | ERP |
| /warehouses | pages/WarehousesPage.jsx | ERP |
| /stock | pages/StockPage.jsx | ERP |
| /stock/opening | pages/OpeningStockPage.jsx | ERP |
| /stock/transfer | pages/StockTransferPage.jsx | ERP |
| /stock/adjustment | pages/StockAdjustmentPage.jsx | ERP |
| /stock/movements | pages/StockMovementsPage.jsx | ERP |
| /damages | pages/DamagesPage.jsx | ERP |
| /suppliers | pages/SuppliersPage.jsx | ERP |
| /supplier-returns | pages/SupplierReturnsPage.jsx | ERP |
| /purchase-orders | pages/PurchaseOrdersPage.jsx | ERP |
| /purchase-orders/new | pages/PurchaseOrderFormPage.jsx | ERP |
| /purchase-orders/:id | pages/PurchaseOrderDetailPage.jsx | ERP |
| /invoices | pages/InvoicesPage.jsx | ERP |
| /invoices/new | pages/InvoiceFormPage.jsx | ERP |
| /invoices/from-sales-order | pages/InvoiceFromSalesOrderPage.jsx | ERP |
| /invoices/:id | pages/InvoiceDetailPage.jsx | ERP |
| /grns | pages/GrnsPage.jsx | ERP |
| /bills | pages/BillsPage.jsx | ERP |
| /bills/from-grn | pages/BillFromGrnPage.jsx | ERP |
| /bills/:id | pages/BillDetailPage.jsx | ERP |
| /payments | pages/PaymentsPage.jsx | ERP |
| /cheques | pages/ChequesPage.jsx | ERP |
| /bank-accounts | pages/BankAccountsPage.jsx | ERP |
| /fund-transfers | pages/FundTransfersPage.jsx | ERP |
| /expenses | pages/ExpensesPage.jsx | ERP |
| /payments/new | pages/PaymentFormPage.jsx | ERP |
| /payments/:id | pages/PaymentDetailPage.jsx | ERP |
| /boms | pages/BomsPage.jsx | ERP |
| /boms/new | pages/BomFormPage.jsx | ERP |
| /boms/:id | pages/BomDetailPage.jsx | ERP |
| /boms/:id/edit | pages/BomFormPage.jsx | ERP |
| /production-orders | pages/ProductionOrdersPage.jsx | ERP |
| /production-orders/new | pages/ProductionOrderFormPage.jsx | ERP |
| /production-orders/:id | pages/ProductionOrderDetailPage.jsx | ERP |
| /returns | pages/ReturnsPage.jsx | ERP |
| /returns/new | pages/ReturnFormPage.jsx | ERP |
| /returns/:id | pages/ReturnDetailPage.jsx | ERP |
| /credit-notes | pages/CreditNotesPage.jsx | ERP |
| /credit-notes/:id | pages/CreditNoteDetailPage.jsx | ERP |
| /pos | pages/PosPage.jsx | ERP |
| /pos-sessions | pages/PosSessionsPage.jsx | ERP |
| /supplier-returns/:id | pages/SupplierReturnDetailPage.jsx | ERP |
| /repairs | pages/RepairsPage.jsx | ERP |
| /repairs/:id | pages/RepairDetailPage.jsx | ERP |
| /employees | pages/EmployeesPage.jsx | ERP |
| /employees/new | pages/EmployeeFormPage.jsx | ERP |
| /employees/:id | pages/EmployeeDetailPage.jsx | ERP |
| /employees/:id/edit | pages/EmployeeFormPage.jsx | ERP |
| /departments | pages/DepartmentsPage.jsx | ERP |
| /designations | pages/DesignationsPage.jsx | ERP |
| /shifts | pages/ShiftsPage.jsx | ERP |
| /attendance | pages/AttendancePage.jsx | ERP |
| /leaves | pages/LeaveRequestsPage.jsx | ERP |
| /holidays | pages/HolidaysPage.jsx | ERP |
| /salary-structures | pages/SalaryStructuresPage.jsx | ERP |
| /payroll | pages/PayrollsPage.jsx | ERP |
| /payroll/:id | pages/PayrollDetailPage.jsx | ERP |
| /payroll/:payrollId/payslip/:employeeId | pages/PayslipDetailPage.jsx | ERP |
| /reports | pages/ReportsPage.jsx | ERP |
| /reports/financial | pages/FinancialReportPage.jsx | ERP |
| /reports/sales | pages/reports/SalesSummaryReportPage.jsx | ERP |
| /reports/sales-by-product | pages/reports/SalesByProductReportPage.jsx | ERP |
| /reports/sales-by-customer | pages/reports/SalesByCustomerReportPage.jsx | ERP |
| /reports/stock-valuation | pages/reports/StockValuationReportPage.jsx | ERP |
| /reports/slow-fast-movers | pages/reports/SlowFastMoversReportPage.jsx | ERP |
| /reports/inventory/low-stock | pages/reports/LowStockReportPage.jsx | ERP |
| /reports/stock-movement | pages/reports/StockMovementReportPage.jsx | ERP |
| /reports/production | pages/reports/ProductionReportPage.jsx | ERP |
| /reports/returns-damages | pages/reports/ReturnsReportPage.jsx | ERP |
| /reports/financial | pages/reports/FinancialSnapshotPage.jsx | ERP |
| /reports/hr | pages/reports/HrReportsPage.jsx | ERP |
| /users | pages/UsersPage.jsx | admin only; ERP layout |
| /roles | pages/RolesPage.jsx | admin only; ERP layout |
| /profile | pages/ProfilePage.jsx | ERP |
| /settings | pages/SettingsPage.jsx | ERP |
| * | pages/NotFoundPage.jsx | Public; outside AppLayout |

ComingSoonPage.jsx is imported but not routed. Every other page file is represented above, including two financial components sharing /reports/financial. This duplicate has a route-ranking/order conflict and requires a baseline decision before mapping to one App Router page. There is a UOM API but no UomsPage.jsx or /uoms route in the actual page inventory. CRUD dialogs and feature modals are not separate URL routes.

## 3. All backend API routes and HTTP methods

Sources: backend/src/server.js and backend/src/routes/*.js. Tables list declared handlers, including the shadowed endpoint noted below. Access denotes route-level gates, supplemented by controller checks in sections 6–7. “Authenticated (any role)” does not imply record ownership or read-only access.

Validator names refer to imported backend Zod schemas. A dash means no route-level Zod validator or shared-service call, respectively. Service calls are direct calls in the named handler; section 4 adds controller helpers, model dependencies and transitive behaviour. Endpoints can change finance or stock without a shared service.

### authRoutes.js — /api/auth

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| POST | /api/auth/register | authController.js → register | Public if no users; otherwise authenticated admin (controller) | registerSchema | — |
| POST | /api/auth/login | authController.js → login | Public | loginSchema | — |
| GET | /api/auth/me | authController.js → getMe | Authenticated (any role) | — | — |
| POST | /api/auth/logout | authController.js → logout | Authenticated (any role) | — | — |
| POST | /api/auth/change-password | authController.js → changePassword | Authenticated (any role) | — | — |
| POST | /api/auth/verify-admin | authController.js → verifyAdmin | Authenticated (any role) | — | — |

### bankRoutes.js — /api/bank-accounts

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/bank-accounts | bankAccountController.js → getBankAccounts | Authenticated (any role) | — | — |
| POST | /api/bank-accounts | bankAccountController.js → createBankAccount | Authenticated (any role) | — | — |
| GET | /api/bank-accounts/:id | bankAccountController.js → getBankAccountById | Authenticated (any role) | — | — |
| PUT | /api/bank-accounts/:id | bankAccountController.js → updateBankAccount | Authenticated (any role) | — | — |
| DELETE | /api/bank-accounts/:id | bankAccountController.js → deleteBankAccount | Authenticated (any role) | — | — |

### billRoutes.js — /api/bills

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/bills/aging/summary | billController.js → getPayablesAging | Authenticated (any role) | — | — |
| GET | /api/bills | billController.js → getBills | Authenticated (any role) | — | — |
| POST | /api/bills | billController.js → createBill | admin, manager, accountant | createBillSchema | — |
| POST | /api/bills/from-grn | billController.js → createFromGrn | admin, manager, accountant | createFromGrnSchema | — |
| GET | /api/bills/:id | billController.js → getBillById | Authenticated (any role) | — | — |
| PATCH | /api/bills/:id/status | billController.js → changeBillStatus | admin, manager, accountant | — | — |

### bomRoutes.js — /api/boms

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/boms | bomController.js → getBoms | Authenticated (any role) | — | — |
| POST | /api/boms | bomController.js → createBom | admin, manager, production_staff | createBomSchema | — |
| GET | /api/boms/:id | bomController.js → getBomById | Authenticated (any role) | — | — |
| PUT | /api/boms/:id | bomController.js → updateBom | admin, manager, production_staff | updateBomSchema | — |
| DELETE | /api/boms/:id | bomController.js → deleteBom | admin, manager | — | — |
| GET | /api/boms/:id/check-availability | bomController.js → checkMaterialAvailability | Authenticated (any role) | — | — |

### brandRoutes.js — /api/brands

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/brands | brandController.js → getBrands | Authenticated (any role) | — | — |
| POST | /api/brands | brandController.js → createBrand | admin, manager | createBrandSchema | — |
| GET | /api/brands/:id | brandController.js → getBrandById | Authenticated (any role) | — | — |
| PUT | /api/brands/:id | brandController.js → updateBrand | admin, manager | updateBrandSchema | — |
| DELETE | /api/brands/:id | brandController.js → deleteBrand | admin, manager | — | — |

### categoryRoutes.js — /api/categories

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/categories | categoryController.js → getCategories | Authenticated (any role) | — | — |
| POST | /api/categories | categoryController.js → createCategory | admin, manager | createCategorySchema | — |
| GET | /api/categories/:id | categoryController.js → getCategoryById | Authenticated (any role) | — | — |
| PUT | /api/categories/:id | categoryController.js → updateCategory | admin, manager | updateCategorySchema | — |
| DELETE | /api/categories/:id | categoryController.js → deleteCategory | admin, manager | — | — |

### chequeRoutes.js — /api/cheques

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/cheques | chequeController.js → getCheques | Authenticated (any role) | — | — |
| POST | /api/cheques | chequeController.js → createCheque | Authenticated (any role) | — | — |
| PUT | /api/cheques/:id/status | chequeController.js → updateChequeStatus | Authenticated (any role) | — | — |

### creditNoteRoutes.js — /api/credit-notes

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/credit-notes | creditNoteController.js → getCreditNotes | Authenticated (any role) | — | — |
| POST | /api/credit-notes | creditNoteController.js → createCreditNote | admin, manager, accountant | — | — |
| GET | /api/credit-notes/:id | creditNoteController.js → getCreditNoteById | Authenticated (any role) | — | — |
| POST | /api/credit-notes/:id/apply | creditNoteController.js → applyCreditNote | admin, manager, accountant | — | — |

### customerGroupRoutes.js — /api/customer-groups

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/customer-groups | customerGroupController.js → getCustomerGroups | Authenticated (any role) | — | — |
| POST | /api/customer-groups | customerGroupController.js → createCustomerGroup | admin, manager | createCustomerGroupSchema | — |
| GET | /api/customer-groups/:id | customerGroupController.js → getCustomerGroupById | Authenticated (any role) | — | — |
| PUT | /api/customer-groups/:id | customerGroupController.js → updateCustomerGroup | admin, manager | updateCustomerGroupSchema | — |
| DELETE | /api/customer-groups/:id | customerGroupController.js → deleteCustomerGroup | admin, manager | — | — |

### customerReturnRoutes.js — /api/customer-returns

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/customer-returns | customerReturnController.js → getReturns | Authenticated (any role) | — | — |
| POST | /api/customer-returns | customerReturnController.js → createReturn | admin, manager, sales_manager, sales_rep, accountant | — | — |
| GET | /api/customer-returns/:id | customerReturnController.js → getReturnById | Authenticated (any role) | — | — |
| PATCH | /api/customer-returns/:id/approve | customerReturnController.js → approveReturn | admin, manager, sales_manager | — | — |
| PATCH | /api/customer-returns/:id/reject | customerReturnController.js → rejectReturn | admin, manager, sales_manager | — | — |
| PATCH | /api/customer-returns/:id/receive | customerReturnController.js → receiveReturn | admin, manager, warehouse_staff | — | — |
| PATCH | /api/customer-returns/:id/process | customerReturnController.js → processReturn | admin, manager, warehouse_staff | — | stockService.js:increaseStock |
| PATCH | /api/customer-returns/:id/issue-credit-note | customerReturnController.js → issueCreditNote | admin, manager, accountant | — | — |
| PATCH | /api/customer-returns/:id/complete | customerReturnController.js → completeReturn | admin, manager, accountant | — | — |
| GET | /api/customer-returns/eligible-orders | customerReturnController.js → getEligibleOrders | Authenticated (any role) | — | — |

### customerRoutes.js — /api/customers

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/customers | customerController.js → getCustomers | Authenticated (any role) | — | — |
| POST | /api/customers | customerController.js → createCustomer | admin, manager, sales_manager, sales_rep | createCustomerSchema | — |
| GET | /api/customers/:id | customerController.js → getCustomerById | Authenticated (any role) | — | — |
| PUT | /api/customers/:id | customerController.js → updateCustomer | admin, manager, sales_manager, sales_rep | updateCustomerSchema | — |
| DELETE | /api/customers/:id | customerController.js → deleteCustomer | admin, manager | — | — |
| PATCH | /api/customers/:id/credit-hold | customerController.js → toggleCreditHold | admin, manager, accountant | — | — |

### damageRoutes.js — /api/damages

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/damages/summary | damageController.js → getDamageSummary | Authenticated (any role) | — | — |
| GET | /api/damages | damageController.js → getDamages | Authenticated (any role) | — | — |
| POST | /api/damages | damageController.js → createDamage | admin, manager, warehouse_staff, production_staff | — | stockService.js:decreaseStock |
| GET | /api/damages/:id | damageController.js → getDamageById | Authenticated (any role) | — | — |
| PATCH | /api/damages/:id/write-off | damageController.js → writeOffDamage | admin, manager | — | — |

### expenseRoutes.js — /api/expenses

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/expenses/categories | expenseController.js → getExpenseCategories | Authenticated (any role) | — | — |
| POST | /api/expenses | expenseController.js → createExpense | Authenticated (any role) | — | — |
| GET | /api/expenses | expenseController.js → getExpenses | Authenticated (any role) | — | — |
| DELETE | /api/expenses/:id | expenseController.js → deleteExpense | admin, manager, accountant | — | — |

### financialReportRoutes.js — /api/financial-reports

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/financial-reports/profit-and-loss | financialReportsController.js → getProfitAndLoss | admin, manager, accountant | — | — |

### fundTransferRoutes.js — /api/fund-transfers

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/fund-transfers | fundTransferController.js → getFundTransfers | Authenticated (any role) | — | — |
| POST | /api/fund-transfers | fundTransferController.js → createFundTransfer | Authenticated (any role) | — | — |
| DELETE | /api/fund-transfers/:id | fundTransferController.js → deleteFundTransfer | Authenticated (any role) | — | — |

### grnRoutes.js — /api/grns

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/grns | grnController.js → getGrns | Authenticated (any role) | — | — |
| POST | /api/grns | grnController.js → createGrn | admin, manager, warehouse_staff | createGrnSchema | stockService.js:increaseStock |
| GET | /api/grns/:id | grnController.js → getGrnById | Authenticated (any role) | — | — |
| DELETE | /api/grns/:id | grnController.js → cancelGrn | admin, manager | — | stockService.js:decreaseStock |

### hrRoutes.js — /api/hr

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/hr/departments | hrController.js → getDepartments | Authenticated (any role) | — | — |
| POST | /api/hr/departments | hrController.js → createDepartment | admin, manager | — | — |
| PUT | /api/hr/departments/:id | hrController.js → updateDepartment | admin, manager | — | — |
| DELETE | /api/hr/departments/:id | hrController.js → deleteDepartment | admin, manager | — | — |
| GET | /api/hr/designations | hrController.js → getDesignations | Authenticated (any role) | — | — |
| POST | /api/hr/designations | hrController.js → createDesignation | admin, manager | — | — |
| PUT | /api/hr/designations/:id | hrController.js → updateDesignation | admin, manager | — | — |
| DELETE | /api/hr/designations/:id | hrController.js → deleteDesignation | admin, manager | — | — |
| GET | /api/hr/employees | hrController.js → getEmployees | Authenticated (any role) | — | — |
| POST | /api/hr/employees | hrController.js → createEmployee | admin, manager | — | — |
| GET | /api/hr/employees/:id | hrController.js → getEmployeeById | Authenticated (any role) | — | — |
| PUT | /api/hr/employees/:id | hrController.js → updateEmployee | admin, manager | — | — |
| DELETE | /api/hr/employees/:id | hrController.js → deleteEmployee | admin, manager | — | — |
| GET | /api/hr/shifts | hrController.js → getShifts | Authenticated (any role) | — | — |
| POST | /api/hr/shifts | hrController.js → createShift | admin, manager | — | — |
| PUT | /api/hr/shifts/:id | hrController.js → updateShift | admin, manager | — | — |
| DELETE | /api/hr/shifts/:id | hrController.js → deleteShift | admin, manager | — | — |
| GET | /api/hr/attendance | hrController.js → getAttendance | Authenticated (any role) | — | — |
| POST | /api/hr/attendance | hrController.js → markAttendance | admin, manager | — | — |
| POST | /api/hr/attendance/bulk | hrController.js → bulkMarkAttendance | admin, manager | — | — |
| GET | /api/hr/leaves | hrController.js → getLeaveRequests | Authenticated (any role) | — | — |
| POST | /api/hr/leaves | hrController.js → createLeaveRequest | Authenticated (any role) | — | — |
| PATCH | /api/hr/leaves/:id/approve | hrController.js → approveLeaveRequest | admin, manager | — | — |
| PATCH | /api/hr/leaves/:id/reject | hrController.js → rejectLeaveRequest | admin, manager | — | — |
| PATCH | /api/hr/leaves/:id/cancel | hrController.js → cancelLeaveRequest | Authenticated (any role) | — | — |
| GET | /api/hr/holidays | hrController.js → getHolidays | Authenticated (any role) | — | — |
| POST | /api/hr/holidays | hrController.js → createHoliday | admin, manager | — | — |
| PUT | /api/hr/holidays/:id | hrController.js → updateHoliday | admin, manager | — | — |
| DELETE | /api/hr/holidays/:id | hrController.js → deleteHoliday | admin, manager | — | — |
| GET | /api/hr/salary-structures | hrController.js → getSalaryStructures | Authenticated (any role) | — | — |
| POST | /api/hr/salary-structures | hrController.js → createSalaryStructure | admin, manager | — | — |
| PUT | /api/hr/salary-structures/:id | hrController.js → updateSalaryStructure | admin, manager | — | — |
| DELETE | /api/hr/salary-structures/:id | hrController.js → deleteSalaryStructure | admin, manager | — | — |

### invoiceRoutes.js — /api/invoices

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/invoices/:id/print-json | invoiceController.js → getInvoicePrintJson | Public | — | — |
| GET | /api/invoices/aging/summary | invoiceController.js → getAgingSummary | Authenticated (any role) | — | — |
| GET | /api/invoices | invoiceController.js → getInvoices | Authenticated (any role) | — | — |
| POST | /api/invoices | invoiceController.js → createInvoice | admin, manager, accountant, sales_manager | createInvoiceSchema | — |
| POST | /api/invoices/from-sales-order | invoiceController.js → createFromSalesOrder | admin, manager, accountant, sales_manager | createFromSalesOrderSchema | — |
| GET | /api/invoices/:id | invoiceController.js → getInvoiceById | Authenticated (any role) | — | — |
| DELETE | /api/invoices/:id | invoiceController.js → deleteInvoice | admin, manager, accountant | — | — |
| PATCH | /api/invoices/:id/status | invoiceController.js → changeInvoiceStatus | admin, manager, accountant, sales_manager | — | — |

### paymentRoutes.js — /api/payments

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/payments | paymentController.js → getPayments | Authenticated (any role) | — | — |
| POST | /api/payments | paymentController.js → createPayment | admin, manager, accountant | — | — |
| GET | /api/payments/:id | paymentController.js → getPaymentById | Authenticated (any role) | — | — |
| DELETE | /api/payments/:id | paymentController.js → deletePayment | admin, manager, accountant | — | — |

### payrollRoutes.js — /api/payroll

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| POST | /api/payroll/process | payrollController.js → processPayroll | admin, manager, accountant | — | payrollCalculator.js:calculatePayslip |
| POST | /api/payroll/preview | payrollController.js → previewPayslip | admin, manager, accountant | — | payrollCalculator.js:calculatePayslip |
| GET | /api/payroll | payrollController.js → getPayrolls | admin, manager, accountant | — | — |
| GET | /api/payroll/:id | payrollController.js → getPayrollById | admin, manager, accountant | — | — |
| PATCH | /api/payroll/:id/approve | payrollController.js → approvePayroll | admin, manager, accountant | — | — |
| PATCH | /api/payroll/:id/mark-paid | payrollController.js → markPayrollPaid | admin, manager, accountant | — | — |
| GET | /api/payroll/:payrollId/payslip/:employeeId | payrollController.js → getEmployeePayslip | Authenticated (any role) | — | — |

### posSessionRoutes.js — /api/pos-sessions

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/pos-sessions | posSessionController.js → getSessions | Authenticated (any role) | — | — |
| GET | /api/pos-sessions/active | posSessionController.js → getActiveSession | Authenticated (any role) | — | — |
| POST | /api/pos-sessions/open | posSessionController.js → openSession | Authenticated (any role) | — | — |
| POST | /api/pos-sessions/close | posSessionController.js → closeSession | Authenticated (any role) | — | — |

### productRoutes.js — /api/products

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/products | productController.js → getProducts | Authenticated (any role) | — | — |
| POST | /api/products | productController.js → createProduct | admin, manager | createProductSchema | — |
| GET | /api/products/:id | productController.js → getProductById | Authenticated (any role) | — | — |
| PUT | /api/products/:id | productController.js → updateProduct | admin, manager | updateProductSchema | — |
| DELETE | /api/products/:id | productController.js → deleteProduct | admin, manager | — | — |

### productionOrderRoutes.js — /api/production-orders

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/production-orders | productionOrderController.js → getProductionOrders | Authenticated (any role) | — | — |
| POST | /api/production-orders | productionOrderController.js → createProductionOrder | admin, manager, production_staff | createProductionOrderSchema | — |
| GET | /api/production-orders/:id | productionOrderController.js → getProductionOrderById | Authenticated (any role) | — | — |
| DELETE | /api/production-orders/:id | productionOrderController.js → deleteProductionOrder | admin, manager | — | — |
| PATCH | /api/production-orders/:id/approve | productionOrderController.js → approveProductionOrder | admin, manager, production_staff | — | — |
| PATCH | /api/production-orders/:id/start | productionOrderController.js → startProductionOrder | admin, manager, production_staff | — | — |
| PATCH | /api/production-orders/:id/complete | productionOrderController.js → completeProductionOrder | admin, manager, production_staff | completeProductionSchema | stockService.js:increaseStock; stockService.js:decreaseStock |
| PATCH | /api/production-orders/:id/hold | productionOrderController.js → holdProductionOrder | admin, manager, production_staff | — | — |
| PATCH | /api/production-orders/:id/cancel | productionOrderController.js → cancelProductionOrder | admin, manager | — | — |

### purchaseOrderRoutes.js — /api/purchase-orders

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/purchase-orders | purchaseOrderController.js → getPurchaseOrders | Authenticated (any role) | — | — |
| POST | /api/purchase-orders | purchaseOrderController.js → createPurchaseOrder | admin, manager, accountant | createPurchaseOrderSchema | — |
| GET | /api/purchase-orders/:id | purchaseOrderController.js → getPurchaseOrderById | Authenticated (any role) | — | — |
| PUT | /api/purchase-orders/:id | purchaseOrderController.js → updatePurchaseOrder | admin, manager, accountant | updatePurchaseOrderSchema | — |
| DELETE | /api/purchase-orders/:id | purchaseOrderController.js → deletePurchaseOrder | admin, manager | — | — |
| PATCH | /api/purchase-orders/:id/status | purchaseOrderController.js → changePurchaseOrderStatus | admin, manager, accountant | — | — |

### repairRoutes.js — /api/repairs

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/repairs | repairOrderController.js → getRepairs | Authenticated (any role) | — | — |
| POST | /api/repairs | repairOrderController.js → createRepair | admin, manager, warehouse_staff, production_staff | — | — |
| GET | /api/repairs/:id | repairOrderController.js → getRepairById | Authenticated (any role) | — | — |
| PUT | /api/repairs/:id | repairOrderController.js → updateRepair | admin, manager, warehouse_staff, production_staff | — | — |
| PATCH | /api/repairs/:id/start | repairOrderController.js → startRepair | admin, manager, warehouse_staff, production_staff | — | — |
| PATCH | /api/repairs/:id/complete | repairOrderController.js → completeRepair | admin, manager, warehouse_staff, production_staff | — | stockService.js:increaseStock |

### reportsRoutes.js — /api/reports

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/reports/production/summary | reports/productionReportsController.js → getProductionSummary | Authenticated (any role) | — | — |
| GET | /api/reports/production/by-product | reports/productionReportsController.js → getProductionByProduct | Authenticated (any role) | — | — |
| GET | /api/reports/production/wastage | reports/productionReportsController.js → getProductionWastage | Authenticated (any role) | — | — |
| GET | /api/reports/returns/summary | reports/returnsReportsController.js → getReturnsSummary | Authenticated (any role) | — | — |
| GET | /api/reports/damages/summary | reports/returnsReportsController.js → getDamagesReport | Authenticated (any role) | — | — |
| GET | /api/reports/financial/snapshot | reports/financialReportsController.js → getFinancialSnapshot | Authenticated (any role) | — | — |
| GET | /api/reports/hr/headcount | reports/hrReportsController.js → getHeadcountReport | Authenticated (any role) | — | — |
| GET | /api/reports/hr/attendance-summary | reports/hrReportsController.js → getAttendanceReport | Authenticated (any role) | — | — |
| GET | /api/reports/hr/leave-patterns | reports/hrReportsController.js → getLeavePatternsReport | Authenticated (any role) | — | — |
| GET | /api/reports/hr/payroll-summary | reports/hrReportsController.js → getPayrollSummaryReport | Authenticated (any role) | — | — |
| GET | /api/reports/dashboard/kpis | dashboardController.js → getDashboardKpis | Authenticated (any role) | — | — |
| GET | /api/reports/dashboard/revenue-chart | dashboardController.js → getRevenueChart | Authenticated (any role) | — | — |
| GET | /api/reports/dashboard/top-products | dashboardController.js → getTopProducts | Authenticated (any role) | — | — |
| GET | /api/reports/dashboard/top-customers | dashboardController.js → getTopCustomers | Authenticated (any role) | — | — |
| GET | /api/reports/sales/summary | reports/salesReportsController.js → getSalesSummary | Authenticated (any role) | — | — |
| GET | /api/reports/sales/by-product | reports/salesReportsController.js → getSalesByProduct | Authenticated (any role) | — | — |
| GET | /api/reports/sales/by-customer | reports/salesReportsController.js → getSalesByCustomer | Authenticated (any role) | — | — |
| GET | /api/reports/sales/trend | reports/salesReportsController.js → getSalesTrend | Authenticated (any role) | — | — |
| GET | /api/reports/inventory/valuation | reports/inventoryReportsController.js → getStockValuation | Authenticated (any role) | — | — |
| GET | /api/reports/inventory/movement | reports/inventoryReportsController.js → getStockMovement | Authenticated (any role) | — | — |
| GET | /api/reports/inventory/slow-fast-movers | reports/inventoryReportsController.js → getSlowFastMovers | Authenticated (any role) | — | — |
| GET | /api/reports/inventory/low-stock | reports/inventoryReportsController.js → getLowStockReport | Authenticated (any role) | — | — |

### salesOrderRoutes.js — /api/sales-orders

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/sales-orders | salesOrderController.js → getSalesOrders | Authenticated (any role) | — | — |
| POST | /api/sales-orders | salesOrderController.js → createSalesOrder | admin, manager, sales_manager, sales_rep | createSalesOrderSchema | stockService.js:decreaseStock |
| GET | /api/sales-orders/:id | salesOrderController.js → getSalesOrderById | Authenticated (any role) | — | — |
| PUT | /api/sales-orders/:id | salesOrderController.js → updateSalesOrder | admin, manager, sales_manager, sales_rep | updateSalesOrderSchema | — |
| DELETE | /api/sales-orders/:id | salesOrderController.js → deleteSalesOrder | admin, manager, sales_manager | — | — |
| PATCH | /api/sales-orders/:id/status | salesOrderController.js → changeSalesOrderStatus | admin, manager, sales_manager, accountant, warehouse_staff | — | stockService.js:decreaseStock; stockService.js:increaseStock |

### settingsRoutes.js — /api/settings

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/settings/company | settingsController.js → getCompanySettings | Authenticated (any role) | — | — |
| PUT | /api/settings/company | settingsController.js → updateCompanySettings | admin, manager | — | — |

### stockRoutes.js — /api/stock

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/stock | stockController.js → getStockItems | Authenticated (any role) | — | — |
| GET | /api/stock/movements | stockController.js → getStockMovements | Authenticated (any role) | — | — |
| GET | /api/stock/reservations | stockController.js → getReservations | Authenticated (any role) | — | — |
| GET | /api/stock/by-product/:productId | stockController.js → getStockByProduct | Authenticated (any role) | — | — |
| POST | /api/stock/opening | stockController.js → createOpeningStock | admin, manager, warehouse_staff | — | stockService.js:increaseStock |
| POST | /api/stock/transfer | stockController.js → transferStock | admin, manager, warehouse_staff | — | stockService.js:increaseStock; stockService.js:decreaseStock |
| POST | /api/stock/adjustment | stockController.js → adjustStock | admin, manager, warehouse_staff | — | stockService.js:increaseStock; stockService.js:decreaseStock |

### supplierReturnRoutes.js — /api/supplier-returns

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/supplier-returns | supplierReturnController.js → getSupplierReturns | Authenticated (any role) | — | — |
| POST | /api/supplier-returns | supplierReturnController.js → createSupplierReturn | admin, manager, accountant, warehouse_staff | — | — |
| GET | /api/supplier-returns/:id | supplierReturnController.js → getSupplierReturnById | Authenticated (any role) | — | — |
| PATCH | /api/supplier-returns/:id/send | supplierReturnController.js → sendSupplierReturn | admin, manager, warehouse_staff | — | stockService.js:decreaseStock |
| PATCH | /api/supplier-returns/:id/record-credit | supplierReturnController.js → recordSupplierCredit | admin, manager, accountant | — | — |

### supplierRoutes.js — /api/suppliers

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/suppliers | supplierController.js → getSuppliers | Authenticated (any role) | — | — |
| POST | /api/suppliers | supplierController.js → createSupplier | admin, manager, accountant | createSupplierSchema | — |
| GET | /api/suppliers/:id | supplierController.js → getSupplierById | Authenticated (any role) | — | — |
| PUT | /api/suppliers/:id | supplierController.js → updateSupplier | admin, manager, accountant | updateSupplierSchema | — |
| DELETE | /api/suppliers/:id | supplierController.js → deleteSupplier | admin, manager | — | — |

### uomRoutes.js — /api/uoms

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/uoms | uomController.js → getUoms | Authenticated (any role) | — | — |
| POST | /api/uoms | uomController.js → createUom | admin, manager | createUomSchema | — |
| PUT | /api/uoms/:id | uomController.js → updateUom | admin, manager | updateUomSchema | — |
| DELETE | /api/uoms/:id | uomController.js → deleteUom | admin, manager | — | — |

### userRoutes.js — /api/users

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/users | userController.js → getUsers | Authenticated (any role) | — | — |
| GET | /api/users/:id | userController.js → getUserById | Authenticated (any role) | — | — |
| PUT | /api/users/:id | userController.js → updateUser | admin | — | — |
| DELETE | /api/users/:id | userController.js → deleteUser | admin | — | — |

### warehouseRoutes.js — /api/warehouses

| Method | Full path | Controller → handler | Route access | Validator | Direct service calls |
| --- | --- | --- | --- | --- | --- |
| GET | /api/warehouses | warehouseController.js → getWarehouses | Authenticated (any role) | — | — |
| POST | /api/warehouses | warehouseController.js → createWarehouse | admin, manager | createWarehouseSchema | — |
| GET | /api/warehouses/:id | warehouseController.js → getWarehouseById | Authenticated (any role) | — | — |
| PUT | /api/warehouses/:id | warehouseController.js → updateWarehouse | admin, manager | updateWarehouseSchema | — |
| DELETE | /api/warehouses/:id | warehouseController.js → deleteWarehouse | admin, manager | — | — |

### Server-level route and routing caveat

GET /api/health → inline handler in server.js; public; returns success, message and timestamp; no controller, shared service or database query.

GET /api/customer-returns/eligible-orders is declared after GET /api/customer-returns/:id. Under the current Express registration order, the earlier ID handler receives eligible-orders; its Mongoose lookup can produce a mapped 404. The declared endpoint remains in this inventory, but its failure must be characterized before deciding intended versus current behaviour.

## 4. Route-to-controller-to-service and database mapping

All route/handler pairs are in section 3. This table completes the mapping at controller-file level. Models includes static and dynamic model imports; it records dependencies, not a claim that every handler writes every model. Helpers includes cross-controller and shared-service imports. Most modules have no separate service.

| Controller under backend/src/controllers | Model dependencies | Imported service/controller helpers |
| --- | --- | --- |
| authController.js | User | Direct Mongoose; no imported shared service |
| bankAccountController.js | BankAccount | Direct Mongoose; no imported shared service |
| billController.js | Bill, Supplier, GoodsReceiptNote | Direct Mongoose; no imported shared service |
| bomController.js | BillOfMaterials, Product, StockItem | Direct Mongoose; no imported shared service |
| brandController.js | Brand | Direct Mongoose; no imported shared service |
| categoryController.js | Category | Direct Mongoose; no imported shared service |
| chequeController.js | Cheque, BankAccount | Direct Mongoose; no imported shared service |
| creditNoteController.js | CreditNote, Invoice, Customer | ./invoiceController.js:updateCustomerBalance |
| customerController.js | Customer | Direct Mongoose; no imported shared service |
| customerGroupController.js | CustomerGroup | Direct Mongoose; no imported shared service |
| customerReturnController.js | CustomerReturn, CreditNote, Customer, SalesOrder, Invoice, Product, DamageRecord, RepairOrder | services/stockService.js:increaseStock; ./invoiceController.js:updateCustomerBalance |
| damageController.js | DamageRecord, Product | services/stockService.js:decreaseStock |
| dashboardController.js | SalesOrder, Invoice, Payment, Customer, Product, StockItem, PurchaseOrder, Bill, ProductionOrder, CustomerReturn, Expense | ./invoiceController.js:updateInvoiceAging; ./billController.js:updateBillAging |
| expenseController.js | Expense, PosSession, BankAccount | Direct Mongoose; no imported shared service |
| financialReportsController.js | Invoice, Expense, Product | Direct Mongoose; no imported shared service |
| fundTransferController.js | FundTransfer, BankAccount | Direct Mongoose; no imported shared service |
| grnController.js | GoodsReceiptNote, PurchaseOrder | services/stockService.js:increaseStock; services/stockService.js:decreaseStock |
| hrController.js | Department, Designation, Employee, Shift, Attendance, LeaveRequest, Holiday, SalaryStructure | Direct Mongoose; no imported shared service |
| invoiceController.js | Invoice, Customer, SalesOrder, CompanySettings | Direct Mongoose; no imported shared service |
| paymentController.js | Payment, Invoice, Bill, Customer, Cheque, BankAccount, Supplier | ./invoiceController.js:updateCustomerBalance |
| payrollController.js | Payroll, Employee, Attendance, LeaveRequest, Holiday, SalesOrder, Expense | services/payrollCalculator.js:calculatePayslip |
| posSessionController.js | PosSession | Direct Mongoose; no imported shared service |
| productController.js | Product | Direct Mongoose; no imported shared service |
| productionOrderController.js | ProductionOrder, BillOfMaterials, Product, StockItem, StockMovement | services/stockService.js:increaseStock; services/stockService.js:decreaseStock |
| purchaseOrderController.js | PurchaseOrder, Supplier, Product, Warehouse | Direct Mongoose; no imported shared service |
| repairOrderController.js | RepairOrder, Product | services/stockService.js:increaseStock |
| reports/financialReportsController.js | Invoice, Bill, Payment, Customer, Expense | invoiceController.js:updateInvoiceAging; billController.js:updateBillAging |
| reports/hrReportsController.js | Employee, Attendance, LeaveRequest, Payroll | Direct Mongoose; no imported shared service |
| reports/inventoryReportsController.js | StockItem, StockMovement, Product | Direct Mongoose; no imported shared service |
| reports/productionReportsController.js | ProductionOrder, DamageRecord | Direct Mongoose; no imported shared service |
| reports/returnsReportsController.js | CustomerReturn, DamageRecord | Direct Mongoose; no imported shared service |
| reports/salesReportsController.js | SalesOrder, Invoice, Payment | Direct Mongoose; no imported shared service |
| salesOrderController.js | SalesOrder, Customer, Product, Warehouse, StockItem, Payment, PosSession, BankAccount | services/stockService.js:decreaseStock; services/stockService.js:increaseStock; ./invoiceController.js:generateInvoiceFromOrders; ./invoiceController.js:updateCustomerBalance |
| settingsController.js | CompanySettings | Direct Mongoose; no imported shared service |
| stockController.js | StockItem, StockMovement, StockReservation | services/stockService.js:increaseStock; services/stockService.js:decreaseStock |
| supplierController.js | Supplier | Direct Mongoose; no imported shared service |
| supplierReturnController.js | SupplierReturn, Supplier, Product | services/stockService.js:decreaseStock |
| uomController.js | UnitOfMeasure | Direct Mongoose; no imported shared service |
| userController.js | User | Direct Mongoose; no imported shared service |
| warehouseController.js | Warehouse | Direct Mongoose; no imported shared service |

### Shared services, utilities and hidden business layers

- services/stockService.js exports increaseStock (weighted-average costing, stock/movement writes and selective product-cost updates), decreaseStock (on-hand check and movement), reserveStock, releaseReservations, fulfillReservations (calls decreaseStock) and getAvailableStock. Reservation helpers exist, but current controllers import increase/decrease only; sales approval directly deducts stock. Do not implement reservation-on-approval merely from comments.
- services/payrollCalculator.js exports calculatePayslip, calculateAPIT, calculateEPFEmployee, calculateEPFEmployer and calculateETF. calculatePayslip calls the statutory helpers and calculates unpaid leave, overtime, taxable/EPF-able earnings, deductions, contributions and net pay with explicit coercion/rounding.
- invoiceController.js exports generateInvoiceFromOrders and updateCustomerBalance for reuse by sales/payment/credit/return flows; updateInvoiceAging is reused by dashboard and financial snapshot. billController.js supplies updateBillAging. These are business functions even though they live in controllers.
- utils/generateToken.js creates JWTs. utils/seedDefaults.js seeds UOMs, categories, customer groups, warehouse, default admin and fixed 2026 holidays when corresponding collections are empty. Embedded seed login values are not reproduced.
- models/Counter.js supplies getNextSequence through atomic increment/upsert; save hooks generate document numbers. The helper does not accept a transaction session; sequence consumption on failed transactions needs characterization.
- Save hooks calculate sales/PO/invoice/bill totals, BOM/production costs, stock availability/value, credit amounts, leave/shift/payroll/POS derived fields and more. Find middleware filters soft-deleted records on many models; aggregation/count operations require separate inspection.

## 5. All Mongoose models and relationships

All files below register Mongoose models. Reference fields include fields inside embedded item/other sub-schemas; repeated leaf names may occur at different nesting levels. [] denotes an explicit array reference. Embedded line items, snapshots and payslips are not separate registered collections. References describe application relationships, not enforced foreign-key constraints.

| Model / file stem in backend/src/models | Reference fields → target model | Pre hooks / Counter dependency |
| --- | --- | --- |
| Attendance | employeeId → Employee; shiftId → Shift; leaveId → LeaveRequest; markedBy → User; approvedBy → User | No pre hook |
| BankAccount | createdBy → User | /^find/ |
| Bill | productId → Product; supplierId → Supplier; purchaseOrderIds[] → PurchaseOrder; grnIds[] → GoodsReceiptNote; approvedBy → User; cancelledBy → User; createdBy → User | save; /^find/; Counter |
| BillOfMaterials | productId → Product; finishedProductId → Product; createdBy → User; updatedBy → User | save; /^find/; Counter |
| Brand | createdBy → User | /^find/ |
| Category | parentCategory → Category; createdBy → User | /^find/ |
| Cheque | paymentId → Payment; customerId → Customer; supplierId → Supplier; depositedBankAccountId → BankAccount; createdBy → User | /^find/ |
| CompanySettings | No declared refs | No pre hook |
| Counter | No declared refs | No pre hook |
| CreditNote | customerId → Customer; customerReturnId → CustomerReturn; invoiceId → Invoice; invoiceId → Invoice; appliedBy → User; createdBy → User | save; /^find/; Counter |
| Customer | customerGroupId → CustomerGroup; assignedSalesRep → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| CustomerGroup | No declared refs | /^find/ |
| CustomerReturn | productId → Product; salesOrderId → SalesOrder; invoiceId → Invoice; stockMovementId → StockMovement; restockedToWarehouseId → Warehouse; repairOrderId → RepairOrder; damageRecordId → DamageRecord; customerId → Customer; salesOrderIds[] → SalesOrder; invoiceIds[] → Invoice; returnToWarehouseId → Warehouse; receivedBy → User; inspectedBy → User; creditNoteId → CreditNote; refundPaymentId → Payment; approvedBy → User; rejectedBy → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| DamageRecord | productId → Product; warehouseId → Warehouse; stockMovementId → StockMovement; reportedBy → User; approvedBy → User | save; /^find/; Counter |
| Department | parentDepartmentId → Department; managerId → Employee | /^find/ |
| Designation | departmentId → Department | /^find/ |
| Employee | userId → User; departmentId → Department; designationId → Designation; reportsToId → Employee; workShift → Shift; salaryStructureId → SalaryStructure; createdBy → User; updatedBy → User | save; /^find/; Counter |
| Expense | posSessionId → PosSession; bankAccountId → BankAccount; createdBy → User; updatedBy → User | save; /^find/; Counter |
| FundTransfer | fromBankAccountId → BankAccount; toBankAccountId → BankAccount; createdBy → User | save; /^find/; Counter |
| GoodsReceiptNote | productId → Product; stockMovementId → StockMovement; purchaseOrderId → PurchaseOrder; supplierId → Supplier; warehouseId → Warehouse; receivedBy → User; verifiedBy → User; createdBy → User | save; /^find/; Counter |
| Holiday | No declared refs | /^find/ |
| Invoice | productId → Product; customerId → Customer; salesOrderIds[] → SalesOrder; salesRepId → User; cancelledBy → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| LeaveRequest | employeeId → Employee; approvedBy → User; rejectedBy → User; createdBy → User | save; /^find/; Counter |
| Payment | customerId → Customer; supplierId → Supplier; receivedBy → User; bankAccountId → BankAccount; createdBy → User | save; /^find/; Counter |
| Payroll | employeeId → Employee; processedBy → User; approvedBy → User; createdBy → User | save; /^find/; Counter |
| PosSession | userId → User | save |
| Product | categoryId → Category; brandId → Brand; productId → Product; createdBy → User; updatedBy → User | save; /^find/; Counter |
| ProductionOrder | productId → Product; warehouseId → Warehouse; stockMovementId → StockMovement; workerId → User; productId → Product; warehouseId → Warehouse; stockMovementId → StockMovement; bomId → BillOfMaterials; finishedProductId → Product; sourceWarehouseId → Warehouse; outputWarehouseId → Warehouse; sourceSalesOrderId → SalesOrder; approvedBy → User; startedBy → User; completedBy → User; cancelledBy → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| PurchaseOrder | productId → Product; supplierId → Supplier; warehouseId → Warehouse; approvedBy → User; grns[] → GoodsReceiptNote; cancelledBy → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| RepairOrder | productId → Product; customerReturnId → CustomerReturn; assignedTechnicianId → User; stockMovementId → StockMovement; returnedToWarehouseId → Warehouse; createdBy → User | save; /^find/; Counter |
| SalaryStructure | No declared refs | /^find/ |
| SalesOrder | productId → Product; customerId → Customer; sourceWarehouseId → Warehouse; salesRepId → User; overrideBy → User; approvedBy → User; cancelledBy → User; createdBy → User; updatedBy → User | save; /^find/; Counter |
| Shift | No declared refs | save; /^find/ |
| StockItem | productId → Product; warehouseId → Warehouse | save |
| StockMovement | productId → Product; warehouseId → Warehouse; fromWarehouseId → Warehouse; toWarehouseId → Warehouse; performedBy → User | save; Counter |
| StockReservation | productId → Product; warehouseId → Warehouse; reservedBy → User | No pre hook |
| Supplier | createdBy → User; updatedBy → User | save; /^find/; Counter |
| SupplierReturn | productId → Product; grnId → GoodsReceiptNote; poId → PurchaseOrder; stockMovementId → StockMovement; supplierId → Supplier; warehouseId → Warehouse; createdBy → User; approvedBy → User | save; /^find/; Counter |
| UnitOfMeasure | No declared refs | No pre hook |
| User | createdBy → User | save; /^find/ |
| Warehouse | warehouseManager → User; assignedRep → User; createdBy → User | /^find/ |

Additional logical relationships not expressed as ref:

- Payment.allocations[].documentType/documentId selects Invoice or Bill; documentNumber is a snapshot.
- StockMovement.sourceDocument.type/id/number links sales orders, opening/transfer/adjustment operations, GRNs/purchase receipts, supplier/customer returns, production orders, damage or repair. StockReservation.sourceDocument links SalesOrder or ProductionOrder and can identify a lineItemId.
- Embedded source-line IDs such as salesOrderLineId, grnLineItemId and poLineItemId refer to subdocuments. Names, codes, prices, addresses and commercial terms are deliberately snapshotted.
- Product/document UOM fields are strings, not UnitOfMeasure ObjectId references. Product bundle components reference Product; category and employee/department hierarchies can self-reference.
- Payroll contains employee payslip subdocuments. CompanySettings is treated as a singleton by its controller. Counter is keyed by a string sequence name.

Preserve unique business numbers/codes, StockItem product/warehouse/batch composite identity, Attendance employee/date uniqueness, defaults, enum values, min/max limits, timestamps, virtual JSON fields, soft-delete filters and index definitions. An enum value does not prove that the API exposes a corresponding transition.

## 6. Authentication and authorization approach

Sources: authRoutes/authController, authMiddleware, User, authValidator, generateToken, frontend authStore/ProtectedRoute/authApi and Axios.

- JWT uses an id payload, JWT_SECRET and JWT_EXPIRES_IN (source fallback 7d). Browser state persists via Zustand auth-storage, with a separate localStorage token entry. Axios adds the bearer header; 401 clears auth and redirects to login.
- protect verifies the JWT and reloads the user, checking active state; User find hooks exclude soft-deleted users. Its broad catch turns errors inside the try, including the inactive-user branch, into a generic 401 invalid/expired-token error. Login separately returns 403 for a deactivated account.
- Passwords are excluded from normal queries and bcrypt-hashed by a save hook with salt cost 10. Registration requires eight characters plus uppercase/lowercase/digit. The change-password controller checks six characters, while the User schema still requires eight.
- Five failed login attempts lock the account for 15 minutes (423). Successful login resets attempts/lock and records lastLogin. Expiry, deactivation, lock state and error messages are preservation requirements.
- Empty-database registration is public and becomes admin; later registration checks admin in the controller. Startup default-admin seeding may populate the database first, so bootstrap sequencing matters.
- authorize checks literal role membership only. Logout returns success without token revocation/blacklisting. No refresh-token, cookie-session or external identity-provider flow was found.
- verify-admin checks the current admin password or another active admin’s supplied credentials for logged-in users. It returns identity, not a scoped authorization token. useAdminVerify executes a callback after success; the UI step does not replace the actual endpoint’s gate.
- Public API exceptions are health, login, conditional first registration and invoice print-json. The Android print route intentionally precedes router.use(protect). Browser receipt pages remain protected.

## 7. User roles and permissions

User.role supports ten roles. Section 3 provides the exact endpoint allowlists; frontend labels are not equivalent enforcement. RolesPage is informational, not a permission editor.

| Role | Observed role-gated responsibilities / limitations |
| --- | --- |
| admin | All named role-gated groups; user update/delete and later registration are admin-only. |
| manager | Broad operational, stock, purchasing, manufacturing, finance and HR writes; no admin-only user mutation. |
| accountant | Supplier/PO writes; bill/invoice/payment/credit operations, customer credit hold, return financial steps, payroll and profit/loss. Not general catalog/warehouse or HR-master mutation. |
| sales_manager | Customer/sales-order writes and approval; invoice creation/status; customer-return creation/approval/rejection. |
| sales_rep | Customer/sales-order create/update and return creation. Sales-order list/detail scoped to own salesRepId. No role-gated status approval. |
| warehouse_staff | Stock, GRNs, permitted sales status changes, return receive/process/send, damage and repair. Controller further restricts sales approval. |
| production_staff | BOM/production operations and damage/repair. BOM/production delete remains admin/manager. |
| inventory_admin | Model and ERP frontend guard support it, but core catalog/stock write route allowlists omit it despite UI descriptions. |
| staff | ERP frontend entry and protect-only endpoints. “View-only” is a display label, not a global write prohibition. |
| customer | Price-checker frontend route only, not common ERP/receipt guards; protect-only APIs do not exclude this role. Absent from frontend ROLES display configuration. |

User.permissions schema values are adjust_stock, manage_prices, approve_po and manage_users; no permission-array enforcement was found in auth middleware or controller checks. The different permission strings in frontend roleConfig.js describe roles for display. The active Sidebar mainly hides adminOnly user/role links; individual pages add role-conditioned buttons.

Authentication-only mutation surfaces include bank account create/update/delete, cheque create/status, fund transfer create/delete, POS open/close, expense creation and leave create/cancel. Reports under /api/reports, including HR/payroll and financial snapshot, require authentication but no role allowlist; the separate profit/loss endpoint restricts admin/manager/accountant. Payslip retrieval has no route-level payroll role gate.

Customer listing accepts an assignedSalesRep filter but has no automatic sales_rep scope equivalent to sales orders. Do not infer ownership restrictions from display descriptions. Any access-policy change needs a separate decision; it is not a mechanical conversion.

## 8. Major ERP modules

| Module | Implemented surface / dependencies |
| --- | --- |
| Catalog/pricing | Products, categories, brands, UOM API, wholesale prices, price checker, types, tier pricing, costs/taxes, packaging and reorder levels. |
| People/commercial data | Customers/groups, suppliers, contacts/addresses, terms, rep assignments, credit holds and blacklist state. |
| Inventory | Warehouses, opening stock, transfers, adjustments, balances, movements, reservation listing, batches and weighted-average costing. |
| Sales/POS | Orders, credit checks, direct approval stock deduction, dispatch/delivery states, invoices, automatic POS invoice/payment/bank/session updates, register opening/closing and receipts. |
| Purchasing | POs, GRNs with/without PO, receipt quality quantities, free-quantity fields, linked PO quantities, bill generation and cancellation. Actual validator acceptance requires deeper review. |
| Receivables/payables | Invoice/bill calculations, aging, allocations, customer balances, payment creation/reversal and credit application. |
| Cash/bank | Bank balances, cheques, transfers/reversal, expenses and expected/actual register cash. These are internal ledgers, not bank APIs. |
| Manufacturing | BOM components/labor/overheads, planned/actual production, material consumption, good/damaged/rejected output and costing. |
| Returns/after-sales | Customer-return lifecycle, restock/repair/scrap, credit/complete; supplier send/credit; damages/write-off; repair start/complete. |
| HR/payroll | Departments, designations, employees, shifts, attendance/bulk attendance, leave, holidays, salary structures, monthly payroll, approval/payment, payslips and sales/expense dependencies. |
| Reporting/admin | Dashboard/charting, sales/inventory/production/returns/financial/HR reports, users, role display, profile/password and company receipt settings. |

## 9. Environment-variable names without secret values

Only backend/.env.example was found among example environment files in the inspected packages. Assignment names were extracted without displaying values. Source references were searched separately; no real environment file was opened.

| Name | Evidence / original purpose | Later conversion treatment |
| --- | --- | --- |
| MONGO_URI | Example; config/db.js | Server-only. Use the user-approved local host 127.0.0.1, port 27017 and database warehouse_system_next. The actual connection-string value belongs only in working-project .env.local when implementation begins. |
| JWT_SECRET | Example; authMiddleware/generateToken | Server-only. Use a new local signing secret; never copy the original. |
| JWT_EXPIRES_IN | Example; generateToken | Preserve token lifetime/fallback semantics. |
| NODE_ENV | Example; server/error middleware | Runtime mode controls logging and error stack exposure. |
| PORT | Example; Express listener | Original API port; replace this responsibility with later Next launch configuration. |
| FRONTEND_URL | Example only; not consumed by current src | Does not currently restrict CORS, which uses origin:true. Reassess only if cross-origin deployment needs it. |
| VITE_API_URL | Frontend api/axios.js and utils/printHelpers.js | Browser API base/Bluetooth URL. Replace Vite substitution; evaluate same-origin /api before introducing a public Next variable. |

Deferred environment work, not performed now: create Ware-House-System/.env.local with the provided local connection value; exclude it in that project’s .gitignore; create and commit a safe .env.example containing variable names and non-sensitive placeholders when implementation is authorized. Never copy original secrets, reuse a production URI or connect the converted application to the original production database. No environment files are created during this audit.

## 10. Uploads, PDF, reports and printing

**Uploads:** no multipart/upload route, multer/cloud-storage dependency, storage adapter or implemented file-upload input was found in the inspected runtime. Employee documents explicitly store URLs with upload infrastructure marked as future work; other models carry image/attachment URL metadata. These fields do not establish an upload service. Uploaded media and real data were excluded.

**PDF:** no server PDF endpoint, PDF-generation dependency or dedicated frontend PDF exporter was found. Browser print dialogs may offer Save as PDF; that is browser behaviour rather than an application PDF pipeline.

**Printing:** InvoiceDetailPage switches between A4 PrintableInvoice and ThermalReceipt, waits 100 ms for rendering, then calls window.print. ReceiptPrintPage is a standalone protected receipt, loads company settings and auto-prints 600 ms after invoice data becomes available. PayslipDetailPage also uses browser printing. index.css and component/receipt CSS control visibility, paper sizing and layout. Company-data sources differ: InvoiceDetailPage has placeholder company details; standalone/Bluetooth receipts use settings. Unifying them would change behaviour.

getBluetoothPrintUrl creates the Android Bluetooth Print custom URI my.bluetoothprint.scheme:// followed by the absolute API URL and /invoices/:id/print-json. It expands relative URLs using browser origin and rewrites localhost/loopback to the browser hostname for LAN access. The public API returns an object keyed by numeric strings containing text commands (type/content/bold/align/format), not the normal success/data envelope. Preserve command shape, receipt totals, formatting, cash/change and footer. Phones must reach the API host; MongoDB remains local to the server.

**Reports:** section 3 lists all dashboard/report APIs: revenue/top products/customers; sales summary/product/customer/trend; stock valuation/movement/slow-fast/low stock; production summary/product/wastage; returns/damages; financial snapshot/profit-and-loss; HR headcount/attendance/leave/payroll. Frontend report pages use filters, tables/charts and formatting. SalesByProductReportPage, SalesByCustomerReportPage and StockValuationReportPage implement CSV downloads. Preserve columns, ordering, date boundaries, status filters and calculations. Some report reads trigger aging writes through shared helpers.

## 11. External integrations

- MongoDB via Mongoose is the persistent datastore. Actual database contents, topology and server version were not inspected.
- Android Bluetooth Print is an implemented external-app integration through custom URI and public print-json payload.
- Browser printing is the printer/PDF interface; receipt SVG graphics are UI output, not a hardware barcode API.
- PriceCheckerPage references an external Unsplash background image. No external URL was contacted for this audit.
- _redirects indicates SPA-host fallback support; it does not establish the actual deployment provider.
- No implemented email/SMS/WhatsApp sender, payment gateway, bank network, biometric device, cloud upload or external payroll/tax API was found in runtime imports/routes. WhatsApp sales source, mobile_wallet payment method and biometric attendance are data categories, not proof of integrations. Payroll calculations are local code.

## 12. Files requiring deeper business-logic analysis

These files contain behaviour that must be characterized before implementation. All paths in the table are under backend/src unless prefixed frontend/src.

| Priority / files | Required analysis |
| --- | --- |
| P0 — services/stockService.js; models/StockItem, StockMovement, StockReservation, Product, Warehouse; controllers/stockController | Weighted cost/rounding, batch identity, on-hand/available, missing/negative stock, movements, transfers, adjustments and session propagation. |
| P0 — salesOrderController, SalesOrder model, salesOrderValidator; frontend/src/pages/SalesOrderFormPage, SalesOrderDetailPage, PosPage | Credit/override, snapshots, default/rep warehouse, status graph, approval deduction/cancellation restoration, hold/reapprove, POS invoice/payment/session/bank and client pricing/cash/change. |
| P0 — invoiceController, billController, paymentController, creditNoteController; matching models/validators and frontend pages | Line/order/global discounts, tax basis, rounding order, due dates/aging, allocation/party checks, balances, reversals and helper side effects. |
| P0 — purchaseOrderController, grnController; PurchaseOrder/GoodsReceiptNote; purchaseOrderValidator; frontend purchase/GRN/BillFromGrn pages and GrnModal | Partial receipts, accepted/rejected/damaged/free quantities, costs/prices, PO links, bill creation, duplicate billing and cancellation rollback. |
| P0 — bomController, productionOrderController; BillOfMaterials/ProductionOrder; validators and frontend production forms | Scaling/wastage, availability, actual consumption/labor/overhead, output cost, QC/damage, partial completion and state guards. |
| P0 — customerReturnController, supplierReturnController, damageController, repairOrderController; corresponding models/pages | Eligibility, quantity limits, each disposition, repair/damage creation, restock costs, repeated requests, credit/refund links and rollback. |
| P0 — authController, userController, authMiddleware, User, authValidator, generateToken, seedDefaults; frontend authStore/ProtectedRoute/AdminVerificationModal/useAdminVerify | Bootstrap, lock/unlock, active/deleted users, password layers, hydration/redirect, actual allowlists and UI verification. |
| P0 — payrollCalculator, payrollController, hrController; Payroll/Employee/Attendance/Shift/LeaveRequest/Holiday/SalaryStructure; HR/payroll pages | Coded contribution/tax slabs, components, working-day/timezone rules, leave/OT, commissions, advances/loans, approval/payment and expenses. No tax-law correctness certification is implied. |
| P1 — bankAccountController, chequeController, fundTransferController, expenseController, posSessionController; models/pages | Balances, state transitions, reversals/transactions, cash reconciliation and deletion semantics. |
| P1 — dashboardController, both financialReportsController paths, controllers/reports/*; frontend reports/APIs | Aggregate filters versus soft deletes, status inclusion, revenue/cost basis, dates/grouping, aging writes, CSV contracts. |
| P1 — validators/*.js; frontend feature *Schemas.js; all model hooks/indexes; validateMiddleware/errorMiddleware | Coercion/field stripping, partial updates, Zod error shape, duplicate/cast/model failures and HTTP/body contracts. |
| P1 — frontend print components, ReceiptPrintPage, InvoiceDetailPage, PayslipDetailPage, printHelpers, index.css; getInvoicePrintJson | A4/thermal/Android output, timing/settings, discount display, browser behaviour and LAN URLs. |
| P1 — remaining catalog/party/warehouse/settings controllers/models/forms; all frontend features/*Api.js and use*.js | Search/filter/sort/pagination, defaults, snapshots, delete guards, modal state, query keys/invalidation and mismatched fields. |
| P1 — models/Counter.js and every sequence/save-hook consumer | Initial upsert sequence, formatting, rollback gaps, concurrency/session scope; do not rely on first-number comments alone. |

Backend validator files: authValidator.js, billValidator.js, bomValidator.js, customerValidator.js, invoiceValidator.js, productValidator.js, productionOrderValidator.js, purchaseOrderValidator.js, salesOrderValidator.js, supplierValidator.js, warehouseValidator.js. Section 3 identifies the schemas actually applied.

Several transactional modules use only controller/model validation; blanket new validation could change accepted requests. updateInvoiceSchema is imported by invoiceRoutes but no general invoice update endpoint uses it.

## 13. Dependency-ordered Next.js migration plan

This is a future execution plan only. No Next.js initialization or implementation is authorized by this audit. All future code, tests, documentation and commits must remain inside Ware-House-System.

| Order | Prerequisites | Future work / acceptance gate |
| --- | --- | --- |
| 1. Characterize contracts | This audit | Synthetic fixtures and success/error/status/role/calculation/transition/side-effect baselines. Explicitly decide known defect versus parity cases. Keep original read-only. |
| 2. Isolated local foundation | 1 | Initialize App Router only in working folder; choose compatible dependencies and scripts. Configure only approved local MongoDB, ignored .env.local and safe committed .env.example. Verify transaction capability without production access. |
| 3. Persistence/model lifecycle | 2 | Cached server connection; preserve all models/collections/fields/indexes/virtuals/hooks and soft deletes; prevent duplicate registration. Port Counter and controlled local bootstrap. Verify hooks and rollback. |
| 4. HTTP/auth/validation | 3 | Preserve parsing/body limits, error envelopes, limiter/CORS/header semantics, JWT/bcrypt, Zod and role gates. Port health/auth/users plus client providers/layout/login/store with hydration/redirect parity. |
| 5. Shared functions/master data | 3–4 | Port stockService/payrollCalculator unchanged, catalog/UOM, parties/groups, warehouses and settings. Verify role gates, snapshots, queries and deletes. |
| 6. Inventory | 5 | Port stock reads/opening/transfer/adjustment/movement/reservation APIs and pages, retaining movements and transactions. |
| 7. Finance foundations/helpers | 5 | Bank/POS-session primitives, invoice generation/customer-balance/aging helpers, bill aging and document models; establish payment/cheque/expense dependencies before POS/payroll. |
| 8. Sales/invoices/POS | 6–7 | Port integrated APIs/pages; verify credit, approve/cancel stock, auto invoice/payment/bank/session writes and every status/error branch. |
| 9. Purchasing/GRNs/bills | 6–7 | Port PO/GRN/bill workflows, partial receipts, auto bill, price effects and cancellations with rollback. |
| 10. Finance completion | 8–9 | Complete receipt/payment allocations, cheques, credit application, expenses, fund transfers/reversal and balance reconciliation. |
| 11. Manufacturing | 6 plus catalog/warehouses | BOM then production APIs/UI, stock consumption and costed output. Gate on cost/stock parity. |
| 12. Returns/damages/repairs | 8–11 and finance helpers | Port all customer/supplier return states, dispositions, repair/damage and downstream stock/finance effects. |
| 13. HR/payroll | 5,7,8,10 | HR masters/calendar/employees, attendance/leave then payroll process/preview/approve/pay/payslip; retain sales/expense dependencies and formulas. |
| 14. Reporting/printing | Relevant modules above | Every report/CSV/dashboard and aging effect; resolve financial path collision; preserve A4/thermal/payslip, standalone receipt and Android protocol. |
| 15. Full parity/readiness | All modules | Complete page/method inventory checks, role/API/UI cases, calculation/status/rollback/concurrency, responsive/cache/print and local end-to-end verification against the baseline. No production connection or data import is implied. |

Route Handlers should be thin HTTP adapters around preserved business functions. Do not mechanically replace save with update queries, remove transactions, merge formulas or switch authentication schemes. Browser-heavy UI requires client boundaries; database/auth secrets remain server-only. Preserve API paths and verbs unless a reviewed compatibility decision says otherwise.

## 14. Migration risks

| Risk | Evidence / implication | Required handling |
| --- | --- | --- |
| Local transaction support | Many controllers use startSession/withTransaction. The supplied URI does not establish topology. | Verify local multi-document transaction support, normally a replica set; keep local database and transaction semantics. Do not disable transactions for standalone tests. |
| Rules distributed across layers | Controllers/helpers/hooks/client calculations/defaults all participate. | Characterize complete outcomes, including errors and rollback. |
| Financial frontend collision | App.jsx has two /reports/financial declarations. | Record baseline and decide how to preserve both functions. |
| Shadowed eligible-orders | Declared after customer-return /:id. | Characterize current response and separately decide defect handling. |
| GRN cancellation/schema conflict | cancelGrn assigns cancelled, absent from GoodsReceiptNote enum, and grn_cancellation, absent from StockMovement source type enum. | Reproduce applicable validation failures with local fixtures before deciding any correction. |
| Validator/model mismatch | GRN validator omits freeQuantity despite downstream usage; warehouse validator omits van and assignedRep supported by model. | Trace UI payload through parsed body into persistence; preserve actual accepted behaviour. |
| Role/permission discrepancies | inventory_admin/staff labels conflict with gates; customer reaches protect-only APIs; permissions array is unenforced. | Preserve actual baseline; separate security redesign from conversion. |
| Public invoice data | Android print endpoint exposes document/customer content without JWT. | Retain protocol compatibility and document exposure; access changes require a separate decision. |
| UI verification not action-bound | Admin verification returns identity, not an action-scoped proof. | Do not mistake a modal for endpoint authorization or role elevation. |
| Seed side effects | Startup seed contains default-admin credentials and fixed-year holidays. | Never run original seeds/config. Explicit safe local bootstrap must record approved deviations; do not copy credentials. |
| Model lifecycle | Direct mongoose.model registration and long-lived Express connection. | Cache connection/registration safely for reloads, retain hooks and avoid module-load database writes. |
| Transaction gaps | Counter lacks session argument; some multi-record finance writes are sequential outside transactions. | Preserve/audit failure ordering rather than assuming atomicity. |
| Soft-delete differences | /^find/ filters do not themselves govern aggregate/count operations. | Check explicit filters, includeDeleted, uniqueness and historical relationships. |
| GET side effects/caching | Aging helpers write during reads; company-settings GET may initialize a record. | Preserve freshness/side effects and avoid inappropriate static caching. |
| Rounding/time/statutory assumptions | toFixed money, locale/date boundaries, coded APIT/EPF/ETF and 2026 holidays. | Preserve coded results; this audit does not validate current legal/tax accuracy. |
| Stock comments versus code | Reservation descriptions differ from direct approval deduction. | Follow actual call paths; test approve/hold/reapprove/cancel and double-deduction cases. |
| Browser-only code | window/localStorage/document, Router hooks, charts, CSV, printing and LAN rewrite. | Explicit client boundaries, hydration/navigation parity and browser checks. |
| Serialization/errors | ObjectIds/Dates/virtuals/populated documents; print response has a different envelope. | Preserve response/status/error shapes; isolate Mongoose from client component boundaries. |
| No established test suite | No npm test script; probe/setup scripts can mutate data. | Later build isolated fixture tests; do not execute original scripts as verification. |
| Stale files/dependencies | Layout copies, unused ComingSoon, semver ranges; lockfiles intentionally unread. | Use actual imports/routes; verify versions when implementation begins. |

### Audit completion and limits

Static inventory checks reconciled 34 mounted route modules, 220 router method/path declarations plus health, 91 frontend route declarations (90 unique paths including wildcard), all 89 page files (ComingSoon is unrouted), 41 models and every explicit model ref occurrence. All route handler names resolve to exported controller functions. No generated scripts or inventory files were saved; only this Markdown report was written.

No runtime/UI screenshot/database topology/index deployment/production behaviour/dependency-resolution test was performed. Suspected behaviours are source findings requiring later isolated characterization. The sole deliverable is this document; stop before application initialization.
