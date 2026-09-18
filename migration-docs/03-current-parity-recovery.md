# Current parity recovery audit

**Status: RED — audit only.** No forward ERP module may be started. The original project at `../Ware-House-System-main` is read-only and remains the authority for every entry below.

## Method and discovered current scope

Inspected original frontend routes/pages/features, backend routes/controllers/models/validators, and current `src/app`, `src/client`, and `src/server`. Current Next scope includes auth, shell/protected routes, dashboard/root, users/roles/profile, categories, brands, UOM API, company settings, warehouses, customer groups, customers, suppliers, products, wholesale pricing, price checker stub, and receipt stub.

The current tree also has uncommitted Product validator work. It is **not** evidence of parity and must not be committed as a recovery completion.

## Parity matrix

| Feature | Classification | Original source | Current source | Required parity behavior / exact gap |
| --- | --- | --- | --- | --- |
| Auth, login/register/me/logout/password/admin verify | [PARITY] | `backend/src/routes/authRoutes.js`, `controllers/authController.js`, `middleware/authMiddleware.js`, `middleware/errorMiddleware.js`, `server.js`, `models/User.js`, `validators/authValidator.js`, `frontend/src/pages/LoginPage.jsx`, `store/authStore.js`, `api/axios.js`, `features/auth/*` | `src/app/api/auth/*`, `src/server/http/handler.js`, `src/server/services/authService.js`, `src/server/auth/*`, `src/server/models/User.js`, `src/server/validators/authValidator.js`, `src/client/features/auth/*`, `src/client/store/authStore.js`, `src/client/api/axios.js`, `src/components/auth/AdminVerificationModal.jsx`, `src/app/login/page.jsx` | Source comparison and 20 isolated-database contract tests confirm first-user bootstrap, later-register auth-before-validation/controller ordering, role checks, field stripping/defaults, lockout, password change, admin verification, JWT and bearer quirks, soft-delete visibility, client token persistence/logout, login destination and the auth-wide 100/15-minute limiter. |
| Protected route boundaries (implemented routes) | [PARITY] | `frontend/src/App.jsx`, `components/ProtectedRoute.jsx`, `pages/UnauthorizedPage.jsx`, `pages/NotFoundPage.jsx` | `src/app/(erp)/layout.jsx`, `components/auth/ProtectedRoute.jsx`, `src/client/auth/access.js`, `src/app/unauthorized/page.jsx`, `src/app/not-found.jsx`, `src/app/price-checker/page.jsx`, `src/app/receipt/[id]/page.jsx` | Restored protected `/` + `/dashboard` route-group behavior by removing the competing public root page; preserved the exact ERP, price-checker and admin-only role matrices, login/unauthorized redirect targets, public unauthorised/not-found pages, and standalone receipt/price-checker guard placement. |
| Unmigrated original route availability / shell interactions | [DIFFERENT] | `frontend/src/App.jsx`, `components/layout/AppLayout.jsx`, `Sidebar.jsx`, `Header.jsx` | `src/app/(erp)/*`, `components/layout/*` | Many original protected page routes remain absent because their modules have not passed recovery; the existing Sidebar can link to them. Header/sidebar visual and mobile/outside-click behavior remains P2 verification work. Do not add placeholder ERP modules merely to make these links resolve. |
| Dashboard/root | [MISSING] | `frontend/src/pages/DashboardPage.jsx` | `src/app/(erp)/dashboard/page.jsx`, `src/app/(erp)/page.jsx` | Compare every KPI, fetch, computed value, loading/empty state and root `/` behavior. |
| Users / roles / profile | [UNVERIFIED] | `pages/UsersPage.jsx`, `RolesPage.jsx`, `ProfilePage.jsx`, `features/users/*`, `backend/src/routes/userRoutes.js` | `src/app/(erp)/users`, `roles`, `profile`, `src/server/services/userService.js` | Verify UserFormModal fields/defaults, role configuration presentation, filters, self-profile mutation, authorization and every user endpoint/status/error. |
| Categories | [UNVERIFIED] | `pages/CategoriesPage.jsx`, `models/Category.js`, `controllers/categoryController.js`, `validators/productValidator.js` | `src/app/(erp)/categories`, `src/server/models/Category.js`, `categoryService.js` | CRUD shape is present. Verify parent/category display order, type/filter query behavior, createdBy, all form errors, search, role actions, soft-delete pre-find hook, population and original UI detail/view flow. |
| Brands | [UNVERIFIED] | `pages/BrandsPage.jsx`, `models/Brand.js`, `controllers/brandController.js` | `src/app/(erp)/brands`, `src/server/models/Brand.js`, `brandService.js` | Verify original fields/indexes/search, soft-delete, view/edit action behavior and client query invalidation. |
| Units of measure | [UNVERIFIED] | `models/UnitOfMeasure.js`, `controllers/unitOfMeasureController.js`, routes | `src/app/api/uoms`, `src/server/models/UnitOfMeasure.js` | Original has API only; compare every method, validation, deletion behavior, query behavior and consumers. Do not invent a page. |
| Company settings | [UNVERIFIED] | `models/CompanySettings.js`, controller/routes, `pages/SettingsPage.jsx`, `features/settings/*` | `src/app/api/settings/company`, `src/app/(erp)/settings` | Compare singleton creation/defaults, all fields, save feedback, permissions, and original settings UI. |
| Warehouses | [UNVERIFIED] | `models/Warehouse.js`, controller/routes, `pages/WarehousesPage.jsx`, `features/warehouses/*` | `src/app/api/warehouses`, `src/app/(erp)/warehouses`, `src/client/features/warehouses/*` | Verify all address/capability/zone/settings fields, manager/rep selection, default-transfer behavior, delete guard, filters, view and form tabs. |
| Customer groups | [UNVERIFIED] | `models/CustomerGroup.js`, controller/routes, `pages/CustomerGroupsPage.jsx` | `src/app/api/customer-groups`, `src/app/(erp)/customer-groups` | Check full commercial defaults, priority ordering, UI fields/defaults, filter behavior, soft delete and validation responses. |
| Customers | [DIFFERENT] | `models/Customer.js`, `controllers/customerController.js`, routes, `pages/CustomersPage.jsx`, `features/customers/CustomerFormModal.jsx`, `QuickCreateCustomerModal.jsx`, schemas/hooks/API | `src/server/models/Customer.js`, `customerService.js`, `src/app/(erp)/customers/page.jsx`, `src/client/features/customers/*` | Current page collapses the original tabbed form into basic CRUD. Missing UI: individual first/last fields; tax/business/industry; assigned sales rep; mobile; billing address; repeatable shipping addresses/default; repeatable additional contacts/role/designation/primary; view mode; credit status panel; credit hold reason input; tab previous/next flow; quick-create modal. Current client schema/payload uses flat contact fields instead of original nested form contract. Verify list columns, status/filter, badges, pagination, authorization and generated code/available-credit hook. |
| Suppliers | [DIFFERENT] | `models/Supplier.js`, controller/routes, `pages/SuppliersPage.jsx`, `features/suppliers/SupplierFormModal.jsx`, `QuickCreateSupplierModal.jsx`, schemas/hooks/API | `src/server/models/Supplier.js`, `supplierService.js`, `src/app/(erp)/suppliers/page.jsx`, `src/client/features/suppliers/*` | Current page omits original four-tab form. Missing UI/payload: first/last, registrations, mobile, billing/shipping address, bank details, shipping terms, internal notes, original field validation and tab navigation. Verify contacts array/model behavior, payment defaults, performance fields, query/filter/sort, roles and soft delete. |
| Products | [DIFFERENT] | `models/Product.js`, controller/routes, `pages/ProductsPage.jsx`, `features/products/ProductFormModal.jsx`, `QuickCreateProductModal.jsx`, schemas/hooks/API | `src/server/models/Product.js`, `productService.js`, `src/app/(erp)/products/page.jsx`, `src/client/features/products/*` | Current page replaces original multi-tab product editor. Missing UI and payload mapping: short name/barcode/description/notes, product nature, flags, variations, combo items, tax, costs/profit calculation, MRP/call price, tier pricing in product form, stock levels, packaging, sales config, all tab navigation and quick-create. Current service omits original StockItem create/sync side effects; preserve original try/catch semantics when stock module exists. Verify sparse indexes, call-price timestamp hook, filters and populated responses. |
| Wholesale prices | [UNVERIFIED] | `pages/WholesalePricesPage.jsx`, Product tier model/controller update | `src/app/(erp)/wholesale-prices/page.jsx`, Product service/validator | Page exists but must compare numeric coercion, default tier values, profit source (`costs.standardCost`), edit cancellation, table presentation, mutation behavior and Product validator acceptance. |
| Price checker | [MISSING] | `pages/PriceCheckerPage.jsx`, original product access behavior | `src/app/(erp)/price-checker/page.jsx` | Current page is a stub. Audit and migrate original search/scan/result, access roles, pricing/stock presentation and error states. |
| Receipt print | [MISSING] | `pages/ReceiptPrintPage.jsx`, `components/print/*`, `utils/printHelpers.js` | `src/app/receipt/[id]/page.jsx` | Current stub lacks original invoice fetch, print layout, thermal/print behavior and standalone route behavior. |

## Recovery queue

### P0 — security, data integrity, and cross-model behavior

1. Auth/protected routing parity — **[PARITY: 2026-09-18]**: rate limiter scope, registration bootstrap authorization and middleware ordering, token/logout behavior, admin verification, redirects and role guard matrix verified. Unmigrated route availability and shell interaction differences remain queued with their owning areas/P2; no placeholder modules are authorized.
2. Product model/service parity: restore and test all validated nested fields plus original StockItem initial create and denormalized sync behavior before any stock work; preserve original swallowed-error behavior.
3. Customer credit behavior: generated code, available-credit calculation, hold reason toggle, role gates, soft delete, and nested commercial/address/contact persistence.
4. Supplier generated code, soft delete, nested commercial/banking persistence and authorization.

### P1 — required original feature behavior

1. Customer tabbed form, QuickCreateCustomerModal and data-layer parity.
2. Supplier tabbed form, QuickCreateSupplierModal and data-layer parity.
3. Product tabbed form, variations/combo/tier flows, QuickCreateProductModal and data-layer parity.
4. Warehouse full form, default behavior, zones/capabilities and manager/rep selection.
5. Price checker and receipt/print behavior.
6. Dashboard, users, roles, profile, settings, categories, brands, UOM and customer group remaining verification/repair.

### P2 — visual and interaction parity

1. Exact loading, empty, error, toast, confirmation, badge, responsive, active-navigation and modal/view-mode differences found by page-by-page comparison.
2. Original print CSS and explicitly implemented mobile behavior.

## Original defects to preserve

| Classification | Original source | Behavior |
| --- | --- | --- |
| [ORIGINAL-DEFECT-TO-PRESERVE] | `frontend/src/App.jsx` | Duplicate `/reports/financial` route declarations create route-order ambiguity; do not silently choose a replacement during recovery without documenting the mapping decision. |
| [ORIGINAL-DEFECT-TO-PRESERVE] | `models/Product.js`, `controllers/productController.js` | StockItem creation/sync errors are caught and logged, allowing Product mutation to succeed; preserve this order/error behavior when the dependent model is migrated. |
| [ORIGINAL-DEFECT-TO-PRESERVE] | `models/Customer.js`, `models/Supplier.js`, `models/Product.js` | Generated code uses shared Counter and can advance on failed/aborted surrounding workflows; do not introduce transactional redesign. |

## Gate decision

**RED.** P0 item 1 (Auth + protected route boundaries) is [PARITY]. The recovery gate remains red because Product, Customer, Supplier and all remaining documented recovery areas are incomplete or unverified. Do not begin any not-yet-migrated ERP module. The next authorized area, only after explicit instruction, is P0 item 2: Product model/service/data-integrity parity.
