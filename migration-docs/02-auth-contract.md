# Authentication, users, roles and authorization contract

Date: 2026-09-16. Baseline: [01-structural-audit.md](01-structural-audit.md), followed by deeper static inspection of the original source. Scope is authentication, user administration, authorization and their frontend behaviour. Other ERP files were inspected only for access checks, identity scoping and verification consumers.

Ware-House-System-main remains strictly read-only. This document is the only new file for this task. No application code, Next.js initialization, environment files, seed/setup execution, network requests or MongoDB connections were performed. No original secret values are reproduced. All future code/test paths below are proposals, not created files.

This is a preservation contract, not a redesign. **Confirmed** means directly expressed by source. **Derived** means an outcome inferred from call order or interacting layers. **Characterize** means a library-dependent, timing-dependent or concurrency outcome needs a later isolated test; it is not claimed as a runtime observation. Source-declared versions are Express ^5.2.1, express-async-handler ^1.2.0, Mongoose ^9.4.1, jsonwebtoken ^9.0.3, bcryptjs ^3.0.3, Zod ^4.3.6 and Zustand ^5.0.12; installed resolutions were not inspected.

## 1. Login request and response contracts

### Endpoint and processing order

POST /api/auth/login is public, behind the shared /api/auth limiter and loginSchema body validation. It accepts JSON; server-wide URL-encoded parsing also exists. Body limit is 10 MB. No auth cookie is issued. An Authorization header attached by Axios is not validated on this public route.

| Field | Server requirement | Transformation |
| --- | --- | --- |
| email | String satisfying Zod email validation; message “Invalid email format” | No explicit controller/schema-parser trim or lowercase operation. Passed to Mongoose email lookup; model defines lowercase/trim setters. Characterize query casting/case handling later. |
| password | String, minimum length 1; message “Password is required” | No trimming, strength check or maximum length in loginSchema. |
| Other keys | Not declared in the Zod object | Standard object parsing strips unrecognized keys; raw body is replaced by parsed output. |

Execution order is: validate body → User.findOne(email).select('+password') → missing-user check → current lock check → inactive check → bcrypt comparison → failure count/save or success reset/save → generate token → respond.

Successful HTTP 200 JSON has exactly this explicitly constructed shape (angle-bracket values are placeholders):

    {
      "success": true,
      "message": "Login successful",
      "data": {
        "_id": "<user ObjectId string>",
        "firstName": "<stored first name>",
        "lastName": "<stored last name>",
        "fullName": "<firstName> <lastName>",
        "email": "<stored email>",
        "role": "<stored role>",
        "lastLogin": "<JSON date string>",
        "token": "<signed JWT>"
      }
    }

It does not include phone, permissions, isActive, createdAt, lastLoginAt or password. This matters because LoginPage stores this abbreviated data as the current user and does not fetch /me afterward.

LoginPage uses react-hook-form and its own loginSchema: empty email → “Email is required”; malformed email → “Invalid email”; empty password → “Password is required”. Native required/email input constraints also apply. It has a password-visibility toggle and pending text “Signing in...”. authApi.login unwraps Axios response.data; LoginPage then separates token from the envelope’s data, stores the remaining user, toasts “Welcome back, <firstName>!” and navigates by role. Backend errors toast response.data.message or “Login failed”; a 401 also triggers a hard redirect through Axios, potentially interrupting the toast.

## 2. Registration and first-admin bootstrap

POST /api/auth/register is the only user-create endpoint; there is no POST /api/users and no public registration page in App.jsx.

| Field | Parsed registration contract |
| --- | --- |
| firstName, lastName | Required strings, length 1–50; no Zod trimming. Model trimming/required validation can still reject whitespace-only names. |
| email | Required email string; model later lowercases/trims and has a unique index. |
| password | Required string, at least 8 characters, at least one ASCII uppercase, lowercase and digit. No special-character requirement or upper limit declared. |
| phone | Optional string. |
| role | Optional, one of all ten model roles in section 8. |
| permissions, isActive, nic, address, emergencyContact, deletedAt, createdBy and other keys | Not in registerSchema; do not become supplied user fields through this endpoint. |

The route counts all User documents. At zero it runs validation without protect. Otherwise it calls protect through a callback, then validation. The controller first checks duplicate email using findOne; then independently counts documents again; then checks authenticated admin if the count is nonzero. At zero, role is forced to admin even if a different valid role was submitted; otherwise supplied role or staff is used. createdBy comes only from req.user, and is normally absent for the first public registration.

Success is HTTP 201:

    {
      "success": true,
      "message": "<bootstrap or ordinary message>",
      "data": {
        "_id": "<id>",
        "firstName": "<name>",
        "lastName": "<name>",
        "fullName": "<firstName> <lastName>",
        "email": "<email>",
        "role": "<role>"
      }
    }

Bootstrap message: “Admin account created successfully. Please login.” Ordinary message: “User registered successfully”. Neither response issues a token or changes the creating administrator’s frontend session.

### Ordering and unusual failure behaviour

- Duplicate email is checked before the controller’s admin check. A valid authenticated non-admin submitting an existing visible email can get 400 “User with this email already exists” instead of the non-admin 403.
- The subsequent-registration route passes a zero-argument callback to protect: it always invokes validate(registerSchema), without forwarding an error argument. **Derived, requiring an integration characterization:** when express-async-handler delivers a protect error to that callback, validation/controller execution can continue. With a valid unique body, the controller then emits 401 “Not authorized. Only existing admins can register new users.”; invalid bodies can produce 400 validation errors, and duplicate bodies can produce the duplicate 400. Do not assume ordinary protect error precedence for this route.
- The two counts and insertion are not in a transaction or lock. Concurrent initial registrations/seeding can race; do not claim guaranteed single-admin creation from the count checks.
- countDocuments is not covered by the User /^find/ soft-delete hook. A database containing only inactive or soft-deleted users is nonempty and does not reopen public bootstrap.
- A soft-deleted user can be invisible to the duplicate find while its email still occupies the unique index. With that index present, creation can fail through duplicate-key handling rather than the friendly duplicate check.

### Default seeding

server.js calls connectDB().then(() => seedDefaults()) without awaiting this before starting the HTTP listener. seedDefaults checks/seeds UOMs, categories, customer groups and warehouse, then calls seedAdminUser and seeds holidays. seedAdminUser counts all users; if any exist it skips, regardless of role/activity/deletion. With zero users it creates a predefined admin directly through User.create, using hard-coded source credentials whose values are intentionally omitted here. This path bypasses registerSchema but runs User model validation and hashing.

Seeding has an outer catch that logs an error; a failure before seedAdminUser can prevent reaching it. There is no atomic transaction across the seeds. Restarting with any user present does not ensure an active admin exists. No original seed was run. A future local bootstrap must use synthetic/new credentials and preserve the documented decision logic without copying original credential values.

## 3. JWT payload, lifetime and validation

generateToken signs an application payload containing only id, using JWT_SECRET and expiresIn = JWT_EXPIRES_IN or the literal fallback 7d. The source does not set algorithm, issuer, audience, subject, jwtid or clock tolerance. Default library behaviour normally adds iat/exp and uses its default signing algorithm; exact encoding and accepted algorithms must be characterized against the declared dependency when implementation begins. Do not infer a role or permissions claim.

protect reads req.headers.authorization only. It accepts headers whose value startsWith('Bearer'), then takes split(' ')[1]. The prefix check is case-sensitive and is not strict equality to the word Bearer. Missing header, lowercase bearer, a missing second space-separated token or an empty second segment produces 401 “Not authorized, no token provided”. A prefix such as BearerExtra followed by a valid token passes the source’s prefix test. No cookie, query-string or body token fallback exists.

For a present extracted token, protect calls jwt.verify(token, JWT_SECRET), then User.findById(decoded.id), checks existence and isActive, sets req.user to the current database user, and calls next. It does not test lockedUntil, failedLoginAttempts, password-change time or a token-version field. Role changes therefore affect API authorization on the next authenticated request without a new token. Existing valid tokens continue to work during a login lock or after a successful password change, provided the user remains active and visible.

Verification failures, missing/deleted user, inactive user, invalid decoded ID and database errors inside this try are normalized to 401 “Not authorized, token invalid or expired”. Even the internally assigned 403 inactive status is overwritten by this catch. There is no token refresh, revocation store, sliding expiry, session table, explicit authentication cookie or OAuth integration in this source.

Only variable names are relevant: JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV, MONGO_URI, PORT and VITE_API_URL; FRONTEND_URL appears in the example but is not used to restrict the current CORS configuration. No values were read from real environment files.

## 4. Password requirements and hashing

| Path | Checks actually applied |
| --- | --- |
| Registration API | Zod 8+ characters with uppercase/lowercase/digit, followed by User model rules. |
| Login API | Nonempty string only, then bcrypt comparison. Unknown email does not perform a dummy hash comparison. |
| Password change API | Truthy currentPassword/newPassword, newPassword.length >= 6, compare current password, then assign/save under model minimum 8. No registration regex rules and no route Zod schema. |
| User update API | Cannot update password: controller selects only firstName, lastName, phone, role, isActive. |
| UserFormModal creation | Separate local Zod schema with 8+ uppercase/lowercase/digit; not the exported authSchemas.registerSchema. |
| Profile UI change | Matching new/confirm values and at least 6 characters, plus required/minLength form checks. Model can still reject length 6–7. |
| Direct seed | Model validation/save hashing only, not registration Zod. No original seed credentials may be copied. |

User.password is required, has minlength 8 and select:false. pre('save') checks isModified('password'); only changed/new passwords use bcrypt.genSalt(10) and bcrypt.hash. matchPassword calls bcrypt.compare. Updating login counters/lastLogin with an unchanged loaded hash does not rehash it. Standard Mongoose save validation precedes save hashing; characterize the 6–7-character change error exactly.

An 8+-character new password without the registration character mix can pass the password-change path. There is no password-history, different-from-current requirement, maximum length, password reset endpoint or unlock endpoint. Malformed non-string change-password inputs lack a dedicated parser: their outcome depends on JavaScript property access, Mongoose casting and bcrypt errors; do not “improve” these silently or claim an exact status without a characterization fixture.

## 5. Failed-login counting and account locking

Default failedLoginAttempts is 0. isLocked returns lockedUntil && lockedUntil > Date.now(); equality to now is no longer locked.

| Starting condition | Outcome | Database effects |
| --- | --- | --- |
| No visible email match | 401 “Invalid email or password” | None. |
| lockedUntil is in future | 423 “Account locked. Try again in N minute(s).” | No increment or extension; N = ceil((lockedUntil − now)/60000). Password is not compared. |
| Not currently locked, isActive false | 403 “Account is deactivated. Contact admin.” | No comparison, count increment or lastLogin write. |
| Active/unlocked, wrong password, resulting count 1–4 | 401 “Invalid email or password. N attempt(s) remaining.” | Increment and save; N = 5 − new count. |
| Active/unlocked, wrong password, resulting count >= 5 | 423 “Account locked due to too many failed attempts. Try again in 15 minutes.” | Increment; lockedUntil = now + 15 minutes; save. |
| Active/unlocked, correct password | 200 login response | Count → 0, lockedUntil → undefined, lastLogin → now, save, then sign JWT. |

Lock checking precedes deactivation. A locked inactive user gets 423 until the lock expires, then 403. Expiration does not reset the stored counter: after count 5 expires, one more incorrect password increments to 6 and immediately starts a new lock. A correct password after expiry resets the state.

The code uses read/modify/save, not an atomic increment or transaction; parallel attempts may lose updates. Saving failure state also updates updatedAt. If login save succeeds and token signing later fails, count/lastLogin changes remain despite no successful token response.

A separate Express limiter covers every /api/auth request, with a 15-minute window and max 100, standard headers enabled, legacy headers disabled and message “Too many login attempts, please try again later”. It does not use a custom store/key generator or trusted-proxy setup in this source; default in-process/IP-oriented library semantics apply and require later header/window testing. It can block /me, logout, registration, change-password and verification as well as login. Its default rejection is 429 with the configured string, not the application JSON error envelope. User routes are outside this limiter.

## 6. Inactive, soft-deleted and permanently deleted users

Inactive users cannot freshly log in (403 unless already locked). Existing tokens fail protect with normalized 401. Nothing automatically logs a user out at the moment an admin deactivates them; the next API request exposes it.

User has deletedAt default null and a /^find/ hook that appends deletedAt:null unless the query’s includeDeleted option is truthy. It affects normal find/findOne/findById and findOne-based update/delete operations. Auth and user controllers do not provide an includeDeleted bypass. Soft-deleted users cannot log in or authenticate with existing JWTs; direct user-detail lookup returns 404. countDocuments is unaffected, causing bootstrap and list-total discrepancies.

**The exposed DELETE /api/users/:id performs a permanent deletion**, despite the schema’s soft-delete field and the frontend’s “Deactivate” wording. It checks visible existence, blocks deleting yourself, then calls findByIdAndDelete. There is no cascade, foreign-key cleanup, token blacklist or active-last-admin safeguard. References in historical records remain but may populate to null. No exposed auth/user endpoint sets deletedAt or restores a soft-deleted user.

An administrator can update their own role or isActive and can demote/deactivate the last active admin; only self-deletion is blocked. Soft-deleted email uniqueness remains index-dependent. Physically deleting a user releases its unique email for a newly created identity; the old token id must not authenticate the new user.

## 7. Logout, password change and user APIs

### Logout

POST /api/auth/logout requires protect and returns HTTP 200 with success:true and message “Logged out successfully”. It changes no database/session record and does not invalidate a previously issued JWT. A missing/expired token still produces the protect error; the API does not treat it as successful logout.

Header logout awaits authApi.logout; whether it succeeds or fails, it invokes local store logout, displays a success toast and navigate('/login'). That navigation is not explicitly replace. A server 401 may independently trigger Axios’s hard navigation. A network request that never settles has no explicit Axios timeout here.

PriceCheckerPage Exit invokes store.logout directly; ProtectedRoute subsequently redirects. UnauthorizedPage’s “Logout & Sign In Again” calls localStorage.clear and sets window.location.href to /login, clearing unrelated origin-localStorage entries as well as auth.

### Password change

POST /api/auth/change-password accepts currentPassword and newPassword; no confirmPassword is required by the API. Missing/falsy fields → 400 “Both current and new passwords are required”; a new password shorter than six → 400 “New password must be at least 6 characters”. It then reloads the current user with password. Missing user → 404 “User not found” (normally only a race after protect). Incorrect current password → 401 “Current password is incorrect”, without incrementing the login counter.

On success it assigns the new password, saves (model hashes it) and returns HTTP 200, success:true, message “Password changed successfully”. It issues no replacement token, performs no logout and does not reset lock counters. Six/seven characters can pass the controller but fail model validation with HTTP 400. ProfilePage clears/hides its password form on success; on failure it toasts response message or “Failed to change password”. A wrong current password also triggers global logout because it is a 401.

### Current user and user administration

| Endpoint | Gate | Request and exact controller response |
| --- | --- | --- |
| GET /api/auth/me | Any active visible authenticated user; shared auth limiter | Re-fetch current user; HTTP 200 {success:true,data:user}. No explicit second-fetch null check. |
| GET /api/users | Any active visible authenticated user | Query role, search, isActive, page (default 1), limit (default 100). HTTP 200 {success:true,count:users.length,total,data:users}. No page/totalPages response fields. |
| GET /api/users/:id | Any active visible authenticated user, no self-only restriction | HTTP 200 {success:true,data:user}; missing → 404 “User not found”. |
| PUT /api/users/:id | admin only | Select only firstName,lastName,phone,role,isActive; findByIdAndUpdate with new:true and runValidators:true; HTTP 200 {success:true,data:user}. No Zod body schema. |
| DELETE /api/users/:id | admin only; self-delete blocked | Missing → 404 “User not found”; self → 400 “Cannot delete yourself”; otherwise hard delete and HTTP 200 {success:true,message:"User deleted permanently from database"}. |

User reads return Mongoose’s serialized document with virtuals, excluding password by default, not a minimal public-profile projection. Fields may include phone, personal metadata, permissions, isActive, failedLoginAttempts, lockedUntil, deletedAt, createdBy and timestamps where present. Login/register responses instead explicitly select a smaller field set.

List search builds raw case-insensitive regex conditions over firstName/lastName/email. Any nonempty isActive query value other than the exact string true becomes false. Numeric page/limit conversion is not range-validated; sorting is firstName ascending without an explicit secondary sort. find applies deletedAt:null; countDocuments(filter) does not, so total may exceed visible records. PUT ignores submitted email/password/permissions/nic/address/deletedAt/createdBy rather than supporting those updates. It uses query validation, not the password save hook.

UsersPage requests 20-row pages, calculates totalPages from total and counts active/inactive/admin summaries from only the returned rows. Its delete UI says “Deactivate”, and useDeleteUser toasts “User deactivated” although the server hard-deletes. Its last-login cell reads lastLoginAt, while the backend writes lastLogin. UserFormModal sends nic/address on create/edit, but registration strips them and PUT ignores them. The creation form does not send isActive, so the model defaults to true.

ProfilePage submits the same admin-only PUT for its own name/phone (and role from local state, isActive:true). Non-admin users can see the form but receive 403. On success only ProfilePage explicitly merges the returned user into auth state; UserFormModal does not. User hooks invalidate ['users'] queries, not every ['user',id] query or auth state.

## 8. All roles and actual enforced permissions

There is no separate authorization middleware file: protect and authorize are both in backend/src/middleware/authMiddleware.js. authorize requires req.user, then exact role membership in the supplied list. It does not consult permissions, a hierarchy, a role database or an admin wildcard. Missing req.user → 401 “Not authorized”; wrong role → 403 “Role '<role>' is not authorized for this action”.

| Role | Backend enum | Frontend ROLES/select | Broad actual privileges (exact gates below) |
| --- | --- | --- | --- |
| admin | Yes | Administrator | Included in all explicit route allowlists; user writes and later registration. No exemption from record/status errors. |
| manager | Yes | Manager | Most operations, finance and HR; no admin-only user write or later registration. |
| accountant | Yes | Accountant | Supplier/PO, finance, payroll, selected invoice/return/credit operations; no general catalog or HR-master writes. |
| sales_manager | Yes | Sales Manager | Customer/sales, selected invoice and customer-return operations. |
| sales_rep | Yes | Sales Rep | Customer/sales create/update and return create, plus scoped sales-order reads; no sales status endpoint allowlist entry. |
| warehouse_staff | Yes | Warehouse Staff | Stock/receipt, certain sales status, return processing, damage/repair. Approval has an extra controller denial. |
| production_staff | Yes | Production Staff | BOM/production and damage/repair; not all deletes/cancellations. |
| inventory_admin | Yes | Inventory Admin | No core product/stock write allowlist entry, despite displayed claims and StockAdjustmentPage access. |
| staff | Yes | Staff | Authenticated-only endpoints include reads and some writes; not actually globally view-only. |
| customer | Yes | Missing | Price checker UI, but any protect-only API remains callable; no global customer-role API exclusion. |

User.permissions permits adjust_stock, manage_prices, approve_po and manage_users. Neither authorize nor backend controller role gates use this array. It cannot be set via the inspected register/user-update endpoints. **Frontend exception:** StockAdjustmentPage explicitly accepts user.permissions containing adjust_stock. Do not describe the entire application as never consulting permissions.

roleConfig display capabilities are: admin all; manager approve_orders/approve_credits/manage_products/view_reports; accountant invoicing/payments/credit_holds/view_financial_reports; sales_manager approve_orders/manage_customers/view_sales_reports; sales_rep create_orders/view_own_customers; warehouse_staff manage_stock/dispatch_orders/receive_grn; production_staff manage_bom/run_production; inventory_admin adjust_stock/manage_stock/manage_products; staff view_only. These display strings do not grant backend access. getRoleConfig falls back to the final Staff entry for an unknown role, including customer. Header has only eight role labels and falls back to “User” for inventory_admin/customer.

### Exact route-level authorization inventory

The following table carries forward every declared method/path from the structural audit, checked against current original route guards. It is an access inventory only; an allowed role must still satisfy validation, record existence and business rules. “Any authenticated” includes all ten active, visible roles. “Conditional bootstrap” has the special control flow in section 2. The shadowed customer-return eligible-orders declaration remains subject to original routing order.

| Method | Path | Role gate | Original route file (backend/src/routes unless server.js) |
| --- | --- | --- | --- |
| POST | /api/auth/register | Conditional bootstrap; otherwise admin | authRoutes.js |
| POST | /api/auth/login | Public | authRoutes.js |
| GET | /api/auth/me | Any authenticated | authRoutes.js |
| POST | /api/auth/logout | Any authenticated | authRoutes.js |
| POST | /api/auth/change-password | Any authenticated | authRoutes.js |
| POST | /api/auth/verify-admin | Any authenticated | authRoutes.js |
| GET | /api/bank-accounts | Any authenticated | bankRoutes.js |
| POST | /api/bank-accounts | Any authenticated | bankRoutes.js |
| GET | /api/bank-accounts/:id | Any authenticated | bankRoutes.js |
| PUT | /api/bank-accounts/:id | Any authenticated | bankRoutes.js |
| DELETE | /api/bank-accounts/:id | Any authenticated | bankRoutes.js |
| GET | /api/bills/aging/summary | Any authenticated | billRoutes.js |
| GET | /api/bills | Any authenticated | billRoutes.js |
| POST | /api/bills | admin, manager, accountant | billRoutes.js |
| POST | /api/bills/from-grn | admin, manager, accountant | billRoutes.js |
| GET | /api/bills/:id | Any authenticated | billRoutes.js |
| PATCH | /api/bills/:id/status | admin, manager, accountant | billRoutes.js |
| GET | /api/boms | Any authenticated | bomRoutes.js |
| POST | /api/boms | admin, manager, production_staff | bomRoutes.js |
| GET | /api/boms/:id | Any authenticated | bomRoutes.js |
| PUT | /api/boms/:id | admin, manager, production_staff | bomRoutes.js |
| DELETE | /api/boms/:id | admin, manager | bomRoutes.js |
| GET | /api/boms/:id/check-availability | Any authenticated | bomRoutes.js |
| GET | /api/brands | Any authenticated | brandRoutes.js |
| POST | /api/brands | admin, manager | brandRoutes.js |
| GET | /api/brands/:id | Any authenticated | brandRoutes.js |
| PUT | /api/brands/:id | admin, manager | brandRoutes.js |
| DELETE | /api/brands/:id | admin, manager | brandRoutes.js |
| GET | /api/categories | Any authenticated | categoryRoutes.js |
| POST | /api/categories | admin, manager | categoryRoutes.js |
| GET | /api/categories/:id | Any authenticated | categoryRoutes.js |
| PUT | /api/categories/:id | admin, manager | categoryRoutes.js |
| DELETE | /api/categories/:id | admin, manager | categoryRoutes.js |
| GET | /api/cheques | Any authenticated | chequeRoutes.js |
| POST | /api/cheques | Any authenticated | chequeRoutes.js |
| PUT | /api/cheques/:id/status | Any authenticated | chequeRoutes.js |
| GET | /api/credit-notes | Any authenticated | creditNoteRoutes.js |
| POST | /api/credit-notes | admin, manager, accountant | creditNoteRoutes.js |
| GET | /api/credit-notes/:id | Any authenticated | creditNoteRoutes.js |
| POST | /api/credit-notes/:id/apply | admin, manager, accountant | creditNoteRoutes.js |
| GET | /api/customer-groups | Any authenticated | customerGroupRoutes.js |
| POST | /api/customer-groups | admin, manager | customerGroupRoutes.js |
| GET | /api/customer-groups/:id | Any authenticated | customerGroupRoutes.js |
| PUT | /api/customer-groups/:id | admin, manager | customerGroupRoutes.js |
| DELETE | /api/customer-groups/:id | admin, manager | customerGroupRoutes.js |
| GET | /api/customer-returns | Any authenticated | customerReturnRoutes.js |
| POST | /api/customer-returns | admin, manager, sales_manager, sales_rep, accountant | customerReturnRoutes.js |
| GET | /api/customer-returns/:id | Any authenticated | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/approve | admin, manager, sales_manager | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/reject | admin, manager, sales_manager | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/receive | admin, manager, warehouse_staff | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/process | admin, manager, warehouse_staff | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/issue-credit-note | admin, manager, accountant | customerReturnRoutes.js |
| PATCH | /api/customer-returns/:id/complete | admin, manager, accountant | customerReturnRoutes.js |
| GET | /api/customer-returns/eligible-orders | Any authenticated | customerReturnRoutes.js |
| GET | /api/customers | Any authenticated | customerRoutes.js |
| POST | /api/customers | admin, manager, sales_manager, sales_rep | customerRoutes.js |
| GET | /api/customers/:id | Any authenticated | customerRoutes.js |
| PUT | /api/customers/:id | admin, manager, sales_manager, sales_rep | customerRoutes.js |
| DELETE | /api/customers/:id | admin, manager | customerRoutes.js |
| PATCH | /api/customers/:id/credit-hold | admin, manager, accountant | customerRoutes.js |
| GET | /api/damages/summary | Any authenticated | damageRoutes.js |
| GET | /api/damages | Any authenticated | damageRoutes.js |
| POST | /api/damages | admin, manager, warehouse_staff, production_staff | damageRoutes.js |
| GET | /api/damages/:id | Any authenticated | damageRoutes.js |
| PATCH | /api/damages/:id/write-off | admin, manager | damageRoutes.js |
| GET | /api/expenses/categories | Any authenticated | expenseRoutes.js |
| POST | /api/expenses | Any authenticated | expenseRoutes.js |
| GET | /api/expenses | Any authenticated | expenseRoutes.js |
| DELETE | /api/expenses/:id | admin, manager, accountant | expenseRoutes.js |
| GET | /api/financial-reports/profit-and-loss | admin, manager, accountant | financialReportRoutes.js |
| GET | /api/fund-transfers | Any authenticated | fundTransferRoutes.js |
| POST | /api/fund-transfers | Any authenticated | fundTransferRoutes.js |
| DELETE | /api/fund-transfers/:id | Any authenticated | fundTransferRoutes.js |
| GET | /api/grns | Any authenticated | grnRoutes.js |
| POST | /api/grns | admin, manager, warehouse_staff | grnRoutes.js |
| GET | /api/grns/:id | Any authenticated | grnRoutes.js |
| DELETE | /api/grns/:id | admin, manager | grnRoutes.js |
| GET | /api/hr/departments | Any authenticated | hrRoutes.js |
| POST | /api/hr/departments | admin, manager | hrRoutes.js |
| PUT | /api/hr/departments/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/departments/:id | admin, manager | hrRoutes.js |
| GET | /api/hr/designations | Any authenticated | hrRoutes.js |
| POST | /api/hr/designations | admin, manager | hrRoutes.js |
| PUT | /api/hr/designations/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/designations/:id | admin, manager | hrRoutes.js |
| GET | /api/hr/employees | Any authenticated | hrRoutes.js |
| POST | /api/hr/employees | admin, manager | hrRoutes.js |
| GET | /api/hr/employees/:id | Any authenticated | hrRoutes.js |
| PUT | /api/hr/employees/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/employees/:id | admin, manager | hrRoutes.js |
| GET | /api/hr/shifts | Any authenticated | hrRoutes.js |
| POST | /api/hr/shifts | admin, manager | hrRoutes.js |
| PUT | /api/hr/shifts/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/shifts/:id | admin, manager | hrRoutes.js |
| GET | /api/hr/attendance | Any authenticated | hrRoutes.js |
| POST | /api/hr/attendance | admin, manager | hrRoutes.js |
| POST | /api/hr/attendance/bulk | admin, manager | hrRoutes.js |
| GET | /api/hr/leaves | Any authenticated | hrRoutes.js |
| POST | /api/hr/leaves | Any authenticated | hrRoutes.js |
| PATCH | /api/hr/leaves/:id/approve | admin, manager | hrRoutes.js |
| PATCH | /api/hr/leaves/:id/reject | admin, manager | hrRoutes.js |
| PATCH | /api/hr/leaves/:id/cancel | Any authenticated | hrRoutes.js |
| GET | /api/hr/holidays | Any authenticated | hrRoutes.js |
| POST | /api/hr/holidays | admin, manager | hrRoutes.js |
| PUT | /api/hr/holidays/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/holidays/:id | admin, manager | hrRoutes.js |
| GET | /api/hr/salary-structures | Any authenticated | hrRoutes.js |
| POST | /api/hr/salary-structures | admin, manager | hrRoutes.js |
| PUT | /api/hr/salary-structures/:id | admin, manager | hrRoutes.js |
| DELETE | /api/hr/salary-structures/:id | admin, manager | hrRoutes.js |
| GET | /api/invoices/:id/print-json | Public | invoiceRoutes.js |
| GET | /api/invoices/aging/summary | Any authenticated | invoiceRoutes.js |
| GET | /api/invoices | Any authenticated | invoiceRoutes.js |
| POST | /api/invoices | admin, manager, accountant, sales_manager | invoiceRoutes.js |
| POST | /api/invoices/from-sales-order | admin, manager, accountant, sales_manager | invoiceRoutes.js |
| GET | /api/invoices/:id | Any authenticated | invoiceRoutes.js |
| DELETE | /api/invoices/:id | admin, manager, accountant | invoiceRoutes.js |
| PATCH | /api/invoices/:id/status | admin, manager, accountant, sales_manager | invoiceRoutes.js |
| GET | /api/payments | Any authenticated | paymentRoutes.js |
| POST | /api/payments | admin, manager, accountant | paymentRoutes.js |
| GET | /api/payments/:id | Any authenticated | paymentRoutes.js |
| DELETE | /api/payments/:id | admin, manager, accountant | paymentRoutes.js |
| POST | /api/payroll/process | admin, manager, accountant | payrollRoutes.js |
| POST | /api/payroll/preview | admin, manager, accountant | payrollRoutes.js |
| GET | /api/payroll | admin, manager, accountant | payrollRoutes.js |
| GET | /api/payroll/:id | admin, manager, accountant | payrollRoutes.js |
| PATCH | /api/payroll/:id/approve | admin, manager, accountant | payrollRoutes.js |
| PATCH | /api/payroll/:id/mark-paid | admin, manager, accountant | payrollRoutes.js |
| GET | /api/payroll/:payrollId/payslip/:employeeId | Any authenticated | payrollRoutes.js |
| GET | /api/pos-sessions | Any authenticated | posSessionRoutes.js |
| GET | /api/pos-sessions/active | Any authenticated | posSessionRoutes.js |
| POST | /api/pos-sessions/open | Any authenticated | posSessionRoutes.js |
| POST | /api/pos-sessions/close | Any authenticated | posSessionRoutes.js |
| GET | /api/products | Any authenticated | productRoutes.js |
| POST | /api/products | admin, manager | productRoutes.js |
| GET | /api/products/:id | Any authenticated | productRoutes.js |
| PUT | /api/products/:id | admin, manager | productRoutes.js |
| DELETE | /api/products/:id | admin, manager | productRoutes.js |
| GET | /api/production-orders | Any authenticated | productionOrderRoutes.js |
| POST | /api/production-orders | admin, manager, production_staff | productionOrderRoutes.js |
| GET | /api/production-orders/:id | Any authenticated | productionOrderRoutes.js |
| DELETE | /api/production-orders/:id | admin, manager | productionOrderRoutes.js |
| PATCH | /api/production-orders/:id/approve | admin, manager, production_staff | productionOrderRoutes.js |
| PATCH | /api/production-orders/:id/start | admin, manager, production_staff | productionOrderRoutes.js |
| PATCH | /api/production-orders/:id/complete | admin, manager, production_staff | productionOrderRoutes.js |
| PATCH | /api/production-orders/:id/hold | admin, manager, production_staff | productionOrderRoutes.js |
| PATCH | /api/production-orders/:id/cancel | admin, manager | productionOrderRoutes.js |
| GET | /api/purchase-orders | Any authenticated | purchaseOrderRoutes.js |
| POST | /api/purchase-orders | admin, manager, accountant | purchaseOrderRoutes.js |
| GET | /api/purchase-orders/:id | Any authenticated | purchaseOrderRoutes.js |
| PUT | /api/purchase-orders/:id | admin, manager, accountant | purchaseOrderRoutes.js |
| DELETE | /api/purchase-orders/:id | admin, manager | purchaseOrderRoutes.js |
| PATCH | /api/purchase-orders/:id/status | admin, manager, accountant | purchaseOrderRoutes.js |
| GET | /api/repairs | Any authenticated | repairRoutes.js |
| POST | /api/repairs | admin, manager, warehouse_staff, production_staff | repairRoutes.js |
| GET | /api/repairs/:id | Any authenticated | repairRoutes.js |
| PUT | /api/repairs/:id | admin, manager, warehouse_staff, production_staff | repairRoutes.js |
| PATCH | /api/repairs/:id/start | admin, manager, warehouse_staff, production_staff | repairRoutes.js |
| PATCH | /api/repairs/:id/complete | admin, manager, warehouse_staff, production_staff | repairRoutes.js |
| GET | /api/reports/production/summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/production/by-product | Any authenticated | reportsRoutes.js |
| GET | /api/reports/production/wastage | Any authenticated | reportsRoutes.js |
| GET | /api/reports/returns/summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/damages/summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/financial/snapshot | Any authenticated | reportsRoutes.js |
| GET | /api/reports/hr/headcount | Any authenticated | reportsRoutes.js |
| GET | /api/reports/hr/attendance-summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/hr/leave-patterns | Any authenticated | reportsRoutes.js |
| GET | /api/reports/hr/payroll-summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/dashboard/kpis | Any authenticated | reportsRoutes.js |
| GET | /api/reports/dashboard/revenue-chart | Any authenticated | reportsRoutes.js |
| GET | /api/reports/dashboard/top-products | Any authenticated | reportsRoutes.js |
| GET | /api/reports/dashboard/top-customers | Any authenticated | reportsRoutes.js |
| GET | /api/reports/sales/summary | Any authenticated | reportsRoutes.js |
| GET | /api/reports/sales/by-product | Any authenticated | reportsRoutes.js |
| GET | /api/reports/sales/by-customer | Any authenticated | reportsRoutes.js |
| GET | /api/reports/sales/trend | Any authenticated | reportsRoutes.js |
| GET | /api/reports/inventory/valuation | Any authenticated | reportsRoutes.js |
| GET | /api/reports/inventory/movement | Any authenticated | reportsRoutes.js |
| GET | /api/reports/inventory/slow-fast-movers | Any authenticated | reportsRoutes.js |
| GET | /api/reports/inventory/low-stock | Any authenticated | reportsRoutes.js |
| GET | /api/sales-orders | Any authenticated | salesOrderRoutes.js |
| POST | /api/sales-orders | admin, manager, sales_manager, sales_rep | salesOrderRoutes.js |
| GET | /api/sales-orders/:id | Any authenticated | salesOrderRoutes.js |
| PUT | /api/sales-orders/:id | admin, manager, sales_manager, sales_rep | salesOrderRoutes.js |
| DELETE | /api/sales-orders/:id | admin, manager, sales_manager | salesOrderRoutes.js |
| PATCH | /api/sales-orders/:id/status | admin, manager, sales_manager, accountant, warehouse_staff | salesOrderRoutes.js |
| GET | /api/settings/company | Any authenticated | settingsRoutes.js |
| PUT | /api/settings/company | admin, manager | settingsRoutes.js |
| GET | /api/stock | Any authenticated | stockRoutes.js |
| GET | /api/stock/movements | Any authenticated | stockRoutes.js |
| GET | /api/stock/reservations | Any authenticated | stockRoutes.js |
| GET | /api/stock/by-product/:productId | Any authenticated | stockRoutes.js |
| POST | /api/stock/opening | admin, manager, warehouse_staff | stockRoutes.js |
| POST | /api/stock/transfer | admin, manager, warehouse_staff | stockRoutes.js |
| POST | /api/stock/adjustment | admin, manager, warehouse_staff | stockRoutes.js |
| GET | /api/supplier-returns | Any authenticated | supplierReturnRoutes.js |
| POST | /api/supplier-returns | admin, manager, accountant, warehouse_staff | supplierReturnRoutes.js |
| GET | /api/supplier-returns/:id | Any authenticated | supplierReturnRoutes.js |
| PATCH | /api/supplier-returns/:id/send | admin, manager, warehouse_staff | supplierReturnRoutes.js |
| PATCH | /api/supplier-returns/:id/record-credit | admin, manager, accountant | supplierReturnRoutes.js |
| GET | /api/suppliers | Any authenticated | supplierRoutes.js |
| POST | /api/suppliers | admin, manager, accountant | supplierRoutes.js |
| GET | /api/suppliers/:id | Any authenticated | supplierRoutes.js |
| PUT | /api/suppliers/:id | admin, manager, accountant | supplierRoutes.js |
| DELETE | /api/suppliers/:id | admin, manager | supplierRoutes.js |
| GET | /api/uoms | Any authenticated | uomRoutes.js |
| POST | /api/uoms | admin, manager | uomRoutes.js |
| PUT | /api/uoms/:id | admin, manager | uomRoutes.js |
| DELETE | /api/uoms/:id | admin, manager | uomRoutes.js |
| GET | /api/users | Any authenticated | userRoutes.js |
| GET | /api/users/:id | Any authenticated | userRoutes.js |
| PUT | /api/users/:id | admin | userRoutes.js |
| DELETE | /api/users/:id | admin | userRoutes.js |
| GET | /api/warehouses | Any authenticated | warehouseRoutes.js |
| POST | /api/warehouses | admin, manager | warehouseRoutes.js |
| GET | /api/warehouses/:id | Any authenticated | warehouseRoutes.js |
| PUT | /api/warehouses/:id | admin, manager | warehouseRoutes.js |
| DELETE | /api/warehouses/:id | admin, manager | warehouseRoutes.js |
| GET | /api/health | Public | server.js |

### Controller identity checks beyond the route table

- Sales-order list forces salesRepId=req.user._id for sales_rep, overriding a supplied rep filter. Detail denies another rep’s order with 403 “Not authorized to view this order”. Update has no equivalent ownership check: route-authorized sales reps can attempt updates to another draft/pending order. Delete excludes reps by its route gate.
- Sales-order status controller checks transition validity before its approval role check. Approval is restricted to admin/manager/sales_manager/accountant, rejecting warehouse_staff with 403 “Not authorized to approve orders”. Other status changes use the broader route allowlist and state graph.
- Sales-order creation allows sales_rep and accepts status approved through its validator; the creation branch does not reuse the separate status-approval role check. Credit override inside the credit-limit branch checks admin/manager/accountant, but accountant is excluded from that create route, so the intersection there is admin/manager. An earlier credit-hold bypass checks creditOverride truthiness without that role test. Preserve these distinctions rather than treating one “approve_orders” capability as universal.
- Sales-rep default warehouse selection uses warehouseManager=req.user._id (then default warehouse fallback); it is not an ownership restriction on all stock or warehouse APIs.
- POS active/open/close select the requesting user’s session. POS session listing only applies userId if explicitly supplied, so it is not automatically self-scoped.
- HR leave creation/cancellation and employee payslip retrieval have no employee-to-req.user ownership check in the examined handlers. Other HR master writes retain route restrictions.
- User delete blocks only self-deletion beyond its admin gate. /users and /users/:id are not self-only. Customer list’s assignedSalesRep filter is optional, not automatically inferred from caller role.

### Frontend route and navigation gates

App.jsx admits nine non-customer roles to the main ERP layout and standalone /receipt/:id. /price-checker allows customer, admin, manager, inventory_admin and staff, excluding accountant/sales_manager/sales_rep/warehouse_staff/production_staff. /users and /roles have nested admin-only guards. /login, /unauthorized and wildcard NotFound are public.

Sidebar hides Staff / Users and User Roles only from non-admins; the remaining menus and New Invoice/New Sales Order/New GRN/New Customer quick actions are not role-filtered. The Price Checker menu is visible to ERP roles that its page guard rejects. RolesPage only displays the static role catalog and counts active users from a limit-500 query; it does not edit roles or permissions.

| Page in frontend/src/pages | UI flag | Exact condition |
| --- | --- | --- |
| BomDetailPage.jsx | canManage | ['admin', 'manager', 'production_staff'].includes(user?.role) |
| BomsPage.jsx | canManage | ['admin', 'manager', 'production_staff'].includes(user?.role) |
| BrandsPage.jsx | canManage | ['admin', 'manager'].includes(user?.role) |
| CategoriesPage.jsx | canManage | ['admin', 'manager'].includes(user?.role) |
| CustomerGroupsPage.jsx | canManage | ['admin', 'manager'].includes(user?.role) |
| CustomersPage.jsx | canManage | ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role) |
| CustomersPage.jsx | canDelete | ['admin', 'manager'].includes(user?.role) |
| CustomersPage.jsx | canHoldCredit | ['admin', 'manager', 'accountant'].includes(user?.role) |
| InvoiceDetailPage.jsx | canCancel | ['admin', 'manager', 'accountant'].includes(user.role) |
| InvoiceDetailPage.jsx | canSend | ['admin', 'manager', 'accountant', 'sales_manager'].includes(user.role) |
| InvoicesPage.jsx | canCreate | ['admin', 'manager', 'accountant', 'sales_manager'].includes(user?.role) |
| LeaveRequestsPage.jsx | canApprove | ['admin', 'manager'].includes(user?.role) |
| ProductionOrderDetailPage.jsx | canProd | ['admin', 'manager', 'production_staff'].includes(user.role) |
| ProductionOrderDetailPage.jsx | canCancel | ['admin', 'manager'].includes(user.role) |
| ProductionOrdersPage.jsx | canCreate | ['admin', 'manager', 'production_staff'].includes(user?.role) |
| ProductsPage.jsx | canManage | ['admin', 'manager'].includes(user?.role) |
| PurchaseOrderDetailPage.jsx | canApprove | ['admin', 'manager', 'accountant'].includes(user.role) |
| PurchaseOrderDetailPage.jsx | canReceive | ['admin', 'manager', 'warehouse_staff'].includes(user.role) |
| PurchaseOrdersPage.jsx | canCreate | ['admin', 'manager', 'accountant'].includes(user?.role) |
| ReturnsPage.jsx | canCreate | ['admin', 'manager', 'sales_manager', 'sales_rep', 'accountant'].includes(user?.role) |
| SalesOrderDetailPage.jsx | canApprove | ['admin', 'manager', 'sales_manager', 'accountant'].includes(user.role) |
| SalesOrderDetailPage.jsx | canDispatch | ['admin', 'manager', 'warehouse_staff'].includes(user.role) |
| SalesOrderDetailPage.jsx | canCancel | ['admin', 'manager', 'sales_manager'].includes(user.role) |
| SalesOrdersPage.jsx | canCreate | ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role) |
| StockAdjustmentPage.jsx | canAdjust | user?.role === 'admin' \|\| user?.role === 'inventory_admin' \|\| user?.permissions?.includes('adjust_stock') |
| StockPage.jsx | canAdjust | ['admin', 'manager', 'warehouse_staff'].includes(user?.role) |
| SuppliersPage.jsx | canManage | ['admin', 'manager', 'accountant'].includes(user?.role) |
| SuppliersPage.jsx | canDelete | ['admin', 'manager'].includes(user?.role) |
| WarehousesPage.jsx | canManage | ['admin', 'manager'].includes(user?.role) |

These are component flags, often combined with document-state conditions; they are not endpoint guards. StockPage shows adjustment access to admin/manager/warehouse_staff, but StockAdjustmentPage admits only admin/inventory_admin or stored adjust_stock permission. The API allows admin/manager/warehouse_staff only. Fresh login data omits permissions, and there is no automatic /me refresh to fill them.

## 9. Frontend token storage and hydration

useAuthStore starts with user:null, token:null, isAuthenticated:false and uses Zustand persist named auth-storage. It supplies no custom storage, partialize, version/migrate, onRehydrateStorage, skipHydration or hasHydrated flag. With its default browser persistence it serializes the state values to localStorage; actions are functions rather than serialized credentials. Browser reload restoration is library-driven, with no token validity check.

login(user,token) writes localStorage token, then sets user/token/isAuthenticated:true. logout removes standalone token and user keys, sets null/null/false, and persist writes the signed-out state; it does not explicitly remove auth-storage. updateUser/setUser replace user only, without reconciling the standalone token, store token or isAuthenticated.

Axios reads only standalone localStorage token for each request; ProtectedRoute trusts isAuthenticated and user from the persisted store. Therefore duplicated state can diverge: authenticated UI without a standalone token gets an API 401; a token alone does not make the route guard authenticated. No signature verification, exp timer, refresh or automatic /me fetch exists in the frontend startup path. authApi.getMe is defined but no runtime caller was found.

ProtectedRoute checks isAuthenticated first (redirect), then null user (renders nothing), then allowedRoles. Its “wait for hydration” comment describes only that null-user branch, not an explicit hydration lifecycle. A future server render must not read window/localStorage server-side, but must reproduce the externally observable client behaviour rather than silently adding a new session validation protocol.

No explicit storage-event synchronization or query-cache clear is configured. Logout is not a React Query cache invalidation; Header navigates within the mounted provider, so previously cached data may persist until refetch/invalidation. Other tabs and stale user roles require characterization; backend re-fetch still enforces the current user on every request.

## 10. HTTP 401, 403, 423 and validation/error behaviour

Normal application errors use:

    { "success": false, "message": "<message>", "stack": "<stack string or null>" }

errorMiddleware uses the previously assigned status unless it is still 200, in which case it selects 500. NODE_ENV exactly production yields stack:null; otherwise err.stack is exposed. Dynamic IDs/times and stack text are not stable fixture literals, but field presence and production-null behaviour are contractual.

| Status | Trigger / message |
| --- | --- |
| 400 | Registration duplicate; missing/short change fields; missing verification password; self-delete; Zod/model/duplicate-key validation. |
| 401 | Missing bearer token; invalid/expired token or missing/inactive user through protect; unknown/wrong login; wrong current password; wrong admin credentials; absent req.user in authorize/controller. Messages differ by path. |
| 403 | Inactive login (when not locked); forbidden route role; later registration by non-admin; non-admin verify request lacking adminEmail; controller ownership/approval denials. |
| 404 | Missing user in direct read/update/delete/password reload; malformed ObjectId mapped to “Resource not found” outside protect. |
| 423 | Existing future lock or failure count reaching/exceeding five. Distinct messages and save effects are in section 5. |
| 429 | Shared auth limiter; configured plain message through limiter, not errorMiddleware JSON. |
| 500 | Unclassified errors without assigned status; e.g. a signing failure after login save. Malformed types can instead be library errors; characterize exact outcomes. |

validateMiddleware runs schema.parse, replaces req.body, and on failure reads error.errors to build “path: message” entries joined by comma, otherwise “Validation failed”. Declared Zod v4 commonly supplies issues instead, so generic “Validation failed” is the expected compatibility concern; no installed-library execution was performed. Do not automatically substitute a richer error response in the migration.

Mongoose ObjectId CastError → 404 “Resource not found”; code 11000 → 400 “Duplicate <field>: <value> already exists” using the first keyValue field; ValidationError → 400 with model error messages joined by comma. Unique index existence is not verified in this audit.

Axios handles every 401, including public login and verification/password mistakes, by asynchronously importing the store, clearing local auth and assigning window.location.href='/login'; it still rejects the original request immediately. There is no corresponding global redirect/logout for 403, 423, 429 or network errors. React Query’s global query retry function returns false for 401/403, otherwise permits one retry; LoginPage uses a mutation without a custom retry policy. Individual mutation error handlers display server messages/fallbacks.

## 11. Redirect behaviour

| Trigger | Exact frontend action |
| --- | --- |
| ProtectedRoute unauthenticated | Navigate to /login with replace and state.from=full current location. |
| ProtectedRoute authenticated, user null | Render null, no redirect. |
| Authenticated role outside allowedRoles | Console warning with role/list/path; Navigate to /unauthorized with replace. |
| Successful login as customer | navigate('/price-checker'), no explicit replace. |
| Successful login as every other role | navigate('/dashboard'), no explicit replace. |
| Already authenticated visiting login | Navigate with replace to price checker for customer, dashboard otherwise; null user falls into dashboard branch. |
| Any Axios 401 | Hard assignment to /login; no attempted destination state saved. |
| Header logout | After request settles, store logout, toast, navigate('/login'). |
| Price-checker Exit | Store logout; surrounding ProtectedRoute supplies redirect. |
| Unauthorized Back to Dashboard | Link to /dashboard for every visitor, including customer. Customer is rejected again by ERP guard. |
| Unauthorized Logout & Sign In Again | Clear all localStorage and hard assignment to /login. |

LoginPage never reads location.state.from, so the attempted destination saved by ProtectedRoute is ignored. API 403 does not itself navigate to UnauthorizedPage. Client role state can be stale after server changes; API denial and visible navigation can disagree until local user state changes.

## 12. Admin verification

POST /api/auth/verify-admin requires a valid current session and shares the auth limiter. There is no route Zod schema. password is required by a truthiness check: absent → 400 “Admin password is required”.

If the reloaded caller is admin, the controller verifies that caller’s password and ignores supplied adminEmail. Failure → 401 “Invalid password”. For a non-admin (or a missing second-fetch user), adminEmail is required or 403 “Not authorized as admin. Please provide admin credentials.” It finds a visible active admin by email, then compares password. No matching admin or mismatch → 401 “Invalid admin credentials”.

Success is HTTP 200:

    {
      "success": true,
      "message": "Admin verification successful",
      "data": { "adminId": "<verified admin id>", "adminName": "<full name>" }
    }

The alternate admin’s lockedUntil and failedLoginAttempts are not checked or updated; correct credentials for a login-locked but active admin can verify. Neither successful nor failed verification resets/increments counters, updates lastLogin, issues a token or records an approval audit event.

The modal requires password and, for a locally non-admin user, an admin-email input. It sends password plus adminEmail only for that non-admin branch. Success toasts “Verified successfully”, calls onVerified(data), onClose, then resets both input states. Failure toasts response message or “Verification failed”. A 401 simultaneously logs the current session out via Axios.

useAdminVerify stores an action callback, optional title/message config and open state. handleVerified invokes the callback without awaiting its promise and closes the modal; closeVerifyModal closes and clears the callback. A later mutation failure is not caught by the verification request’s try/catch merely because the callback was async.

StockAdjustmentPage and InvoiceDetailPage invoke verification before their actions, but do not pass verifyConfig title/message to the rendered modal; default copy is displayed. Their callbacks ignore adminData and send the original caller’s JWT. There is no action-scoped grant or role switch. A successful admin verification cannot make inventory_admin pass the stock API’s allowlist, and an authorized API caller can call the mutation endpoint directly without this UI verification.

UsersPage imports/renders the modal and hook but never calls requestAdminVerify; its deletion follows ConfirmDialog directly. Do not add a verification requirement to that flow during initial conversion.

Modal password/email state is reset on successful verification, not ordinary cancel/close; because the component remains mounted while its child Modal returns null, reopening can retain inputs. Escape, overlay and X still call onClose. Cancel is disabled while isLoading, but the verify button passes isLoading to a Button that expects loading, so the intended submit spinner/disable behaviour does not apply; no request guard prevents duplicate submissions. These are UI parity findings, not fixes made here.

## 13. User model hooks and database side effects

| Operation | Reads/writes and hook implications |
| --- | --- |
| Register | Route count, duplicate find, controller count, create. Sets server-controlled role/createdBy, model defaults/timestamps, hashes new password. No transaction. |
| Seed admin | Count all users; optional direct create; same model hash hook, no registration validator. |
| Successful login | Read with password, update/reset counters and lastLogin, save/updatedAt, then sign. No password rehash when unchanged. |
| Wrong unlocked login | Read/compare; increment attempts; optionally set lock; save/updatedAt. |
| Locked/inactive/unknown login | Read only; no save or counter change. |
| protect | Read current user every authenticated request; no last-seen write, lock check or session renewal. |
| /me | protect read plus second user read; a removal between reads can yield success with data:null. |
| Password change | protect read, second read with hash, compare, assign/hash/save/updatedAt. No session invalidation/count reset. |
| Verify admin | protect read, caller re-read with hash; optional alternate-admin read; bcrypt compare. No save. |
| User PUT | protect plus findByIdAndUpdate; validation and timestamps, /^find/ filter, no pre-save hashing. Only selected fields change. |
| User DELETE | protect, target read, self-check, permanent findByIdAndDelete. No cascade. |
| User list | find filtered by soft deletion plus count without that hook; no database write. |
| API logout | protect read only; no session/delete/revocation write. |

Model fields: required firstName/lastName (trim/max 50), required unique lowercase trimmed email with email regex, trimmed optional phone, password rules above, role default staff, nic/address/emergencyContact strings, permissions enum array, isActive default true, lastLogin Date, failedLoginAttempts default 0, lockedUntil Date, createdBy User reference, deletedAt default null and timestamps. fullName virtual concatenates names with a space; toJSON/toObject enable virtuals. There is no custom serializer that universally removes a password explicitly selected with +password; current auth responses avoid returning the selected document.

## 14. Known inconsistencies to preserve initially

These findings refine the structural audit; that earlier document was not edited. Preserve externally observable behaviour until a separately approved change. Framework adapters may change implementation mechanics, but must not silently change outcomes.

| ID | Baseline discrepancy |
| --- | --- |
| K01 | Deactivate UI and toast permanently delete the User; historical references are not cascaded. |
| K02 | Last-login UI reads lastLoginAt; API/model provide lastLogin. |
| K03 | Profile edit is visible to non-admins but uses an admin-only PUT. |
| K04 | Registration 8+ mixed-character policy versus password-change UI/controller 6+ and model 8+, without regex strength checks. |
| K05 | Protect’s inactive-user 403 is caught and rewritten to 401; inactive login remains 403. |
| K06 | Wrong login/current password/admin verification all trigger global logout on 401. |
| K07 | Persisted auth and standalone token can diverge; no startup /me, expiry timer or automatic role refresh. |
| K08 | Saved attempted route is ignored at successful login; customer dashboard link can lead back to unauthorized. |
| K09 | Model/API support 10 roles, ROLES/select supports 9, old exported frontend registration schema and Header labels cover only 8. |
| K10 | Permission-array UI check exists only on stock adjustment among scanned guards; backend role gates ignore it. Fresh login omits permissions. |
| K11 | inventory_admin is admitted by stock-adjustment UI but excluded by API; manager/warehouse_staff are the opposite unless UI permission data is available. |
| K12 | All authenticated roles can read users and numerous sensitive reports; several write endpoints are protect-only. “View-only” is not enforced globally. |
| K13 | Admin verification is not an action-bound grant, ignores login lock/counters and does not elevate the original token. |
| K14 | Verification titles/config are not passed by consumers; users deletion never invokes verification; modal loading prop is mismatched and cancellation retains inputs. |
| K15 | Login lock expiry does not reset count; one subsequent wrong attempt relocks. Existing tokens remain usable while login is locked. |
| K16 | Password change/logout do not revoke existing JWTs. No password reset/unlock API despite login’s contact-admin guidance. |
| K17 | User counts include soft-deleted records while finds hide them; existing hidden users also block public/bootstrap seeding. |
| K18 | Create/edit NIC/address inputs do not persist through these endpoints; permissions cannot be assigned via them. |
| K19 | Registration callback can swallow protect errors; duplicate check precedes controller admin check. Characterize exact library-mediated outcomes. |
| K20 | Bootstrap/seeding and failed-attempt updates are not concurrency-safe; no last-admin protection. |
| K21 | Expected generic Zod error text due to errors-versus-issues mismatch; do not replace error shape silently. |
| K22 | Sales-rep ownership is checked on reads, not update; creation/status approval gates and credit-override intersections differ. |
| K23 | Public invoice print-json bypasses authentication; protected browser receipt does not. |
| K24 | In-memory query cache is not cleared on normal logout; API truth and stale client state can disagree. |

## 15. Acceptance-test cases for the Next.js migration

These are test specifications only; no test files or execution were created. Later use newly generated users/passwords/JWT secrets, fake clocks, mocked failure points and the user-approved isolated local database. Never use original accounts, real environment files, seed credentials or production data. Compare HTTP status/body/headers, database deltas, token contents and browser state, not just successful rendering.

Tests tagged C require characterization of dependency/timing behaviour before assigning an exact migration oracle. A preserved inconsistency is a passing baseline case, not authorization to fix it.

| ID | Setup/action | Expected baseline |
| --- | --- | --- |
| A01 | Active unlocked user, correct login | 200 exact explicit data fields; token separate from stored frontend user; counters reset; lastLogin/updatedAt change. |
| A02 | Unknown email, valid body | 401 “Invalid email or password”; no user write; frontend hard login redirect. |
| A03 | Four sequential wrong passwords from count 0 | 401 messages show 4,3,2,1 remaining; persisted increments. |
| A04 | Fifth wrong password | 423 lock message; count 5; lockedUntil now+15 minutes. |
| A05 | Correct/wrong password during lock | 423 remaining-minute message, no hash comparison/count/lock extension. |
| A06 | Locked inactive account | 423 takes priority; inactive unlocked account gets 403 without writes. |
| A07 | Clock exactly at expiry, then wrong password | Lock check false; count 6, new 15-minute lock. |
| A08 | Correct password after expiry | 200; count 0; lock removed; lastLogin saved. |
| A09 | Valid JWT for login-locked active user | Protect succeeds despite lockedUntil. |
| A10 C | Concurrent wrong attempts | Capture read/modify/save races; no invented atomic-count guarantee. |
| A11 | Login save succeeds, JWT signing fails | Error response; saved lastLogin/counter reset remains. |
| A12 | Missing/malformed login fields; extra keys | 400 parser error before database query; extras do not alter controller data. |
| A13 C | Email case/whitespace, overlong/malformed input | Pin Zod-vs-Mongoose normalization/error ordering without inventing controller trimming. |
| A14 | Completely empty users, valid public register with staff role | 201 admin, bootstrap message, no JWT, no caller createdBy. |
| A15 | Existing user, admin creates no-role user | 201 staff, ordinary message, createdBy admin, hash stored; creating session unchanged. |
| A16 | Existing user, non-admin valid new registration | 403 “Only admins can register new users”. |
| A17 | Non-admin registration using existing visible email | Duplicate 400 precedes controller role denial. |
| A18 C | Existing users, missing/invalid token, invalid/duplicate/unique registration body | Verify swallowed-error callback cases: validation 400, duplicate 400 or controller-specific 401, not assumed generic protect response. |
| A19 | Valid first registration with disallowed role or weak password | Validation fails before forced-admin logic. |
| A20 | Whitespace-only names pass string-length parser | Model required validation after trim prevents persistence. |
| A21 | Create includes permissions/isActive:false/nic/address | Extra fields stripped; active defaults true; no permission/personal metadata write. |
| A22 | Database contains only soft-deleted/inactive users | No public first-admin branch; default-admin seed logic skips. |
| A23 C | Concurrent first registrations plus simulated seed | Capture count/insert race; no new locking guarantees silently added. |
| A24 | Synthetic seed decision test, zero versus nonzero users | Direct model creation only at zero; no original credentials or real seed execution. |
| A25 | Seed stage throws before admin step | Outer catch path; later admin stage not executed. |
| A26 C | Correct synthetic JWT signing configuration | id application claim, default/explicit lifetime iat/exp, no role claim; pin library defaults. |
| A27 | Missing header/lowercase bearer/empty second segment | 401 no-token message. |
| A28 | BearerExtra plus valid token separated by one space | Prefix accepted by source; authenticate if token/user valid. |
| A29 | Expired/bad-signature/malformed JWT | 401 normalized invalid/expired-token message. |
| A30 | Valid JWT points to absent/deleted/inactive user | 401 same normalized message; no user state change. |
| A31 | Change stored role while keeping same JWT | Next request uses new database role; old client menu may remain stale. |
| A32 | Non-admin uses admin endpoint with permissions manage_users | 403 literal role denial; permissions do not override. |
| A33 | Valid logout then reuse same token directly | Logout 200; reused JWT still works until ordinary invalidation conditions. |
| A34 | API logout missing/expired token | 401; Header still logs out locally after rejection. |
| A35 | Successful change to 8+ lowercase-only synthetic password | Passes current-password/model checks without registration regex; old JWT remains valid. |
| A36 | New password lengths 0,5,6,7 | Missing/falsy or <6 controller errors; 6–7 model 400; hash unchanged on failure. |
| A37 | Wrong current password | 401 exact message; no counter increment; browser global logout. |
| A38 | Correct password change | Changed salted hash; no token rotation, count reset or replacement session; subsequent login uses new password. |
| A39 C | Non-string password-change/verification bodies | Pin current JS/Mongoose/bcrypt errors rather than replacing with a new schema. |
| A40 | GET /me, GET /users/:id as staff/customer | Allowed for active visible caller; no password in serialized document; metadata/virtuals preserved. |
| A41 | GET /users with role/search/isActive/page/limit | Preserve regex filter, exact 'true' comparison, firstName order and response shape. |
| A42 | Soft-deleted rows match list filters | total can include them, data/count exclude them. |
| A43 | PUT user as non-admin/self | 403 even if UI profile form allowed navigation. |
| A44 | Admin PUT known fields plus email/password/permissions/nic/address | Only five selected fields updated; no password hash change. |
| A45 | Admin demotes/deactivates self or last admin | Update allowed; next API uses new role/activity; no last-admin safeguard. |
| A46 | Delete self versus another user | Self 400; other permanently removed, exact response; old token fails; no cascading history cleanup. |
| A47 | Invalid ID versus valid absent ID | 404 “Resource not found” versus 404 “User not found” on direct user endpoints. |
| A48 C | Hidden duplicate email with unique index present | Friendly find misses it; duplicate-key 400; verify field-specific message. |
| A49 | Empty storage, protected deep link | Replace redirect with from state; successful login ignores from. |
| A50 | Persisted auth true/user null | Guard renders null; login’s existing-session branch can target dashboard. |
| A51 | Persisted auth true without standalone token | UI can enter; first protected API 401 clears auth/hard redirects. |
| A52 | Standalone token without authenticated store | ProtectedRoute redirects despite available header token. |
| A53 | Reload valid persisted state | No automatic /me refresh; role/permissions remain stored snapshot. |
| A54 | Login customer versus each other role | Customer price checker; others dashboard; already-authenticated redirects use replace. |
| A55 | Customer follows Unauthorized Back to Dashboard | ERP guard sends back to unauthorized. |
| A56 | API 403/423/network failure | Rejected request/toast as relevant, no Axios global logout or unauthorized redirect. |
| A57 | All Axios 401 sources, including public login | Asynchronous store logout plus hard /login assignment; original promise rejects. |
| A58 | Header logout, price Exit, unauthorized logout | Three distinct flows; unauthorized clears all localStorage, others store keys/state only. |
| A59 C | Header logout then different-user login with cached queries | Capture retained React Query cache and current refetch timing; no assumed cache reset. |
| A60 | Verify as admin with own correct password plus another adminEmail | Caller credentials used; success contains caller id/name; no DB writes/token. |
| A61 | Verify as non-admin without email or without password | Exact 403 or 400 branches, with password check first. |
| A62 | Verify non-admin using active alternate admin | Success identity; mutation still uses original token/role. |
| A63 | Alternate admin inactive/deleted/wrong password | 401 invalid admin credentials; current browser session logs out. |
| A64 | Active alternate admin login-locked with correct password | Verification succeeds; lock/counters unchanged. |
| A65 | Wrong own-admin verification password | 401 “Invalid password”; no login counter change; frontend logout. |
| A66 | Stock/invoice verification success followed by async action failure | Modal closes before action completes; action uses its own error handling, no privilege elevation. |
| A67 | Cancel/reopen verification modal | Inputs retained until success/unmount; callback cleared on close. |
| A68 | Verification pending; submit/escape/overlay | Preserve loading-prop mismatch and independent close paths; characterize duplicate requests. |
| A69 | UsersPage delete flow | Confirmation directly calls DELETE; unused admin modal does not block it. |
| A70 | Enumerate all 10 roles against every access-matrix row | Allowed roles pass only auth gate; excluded roles 403; no token 401 except public/bootstrap routes. Use valid fixtures to isolate gate results. |
| A71 | Sales rep other-order list/detail/update | List scoped; detail 403; update lacks ownership gate but retains status rules. |
| A72 | Warehouse staff approve via sales status endpoint | Valid transition then 403; invalid transition can yield 400 first. |
| A73 | Sales rep submits approved order creation; credit override variants | Characterize create-versus-status and hold-versus-limit role-check differences without broadening scope into formula changes. |
| A74 | Staff/customer accesses HR payslip/leave cancel and report/user reads | No added employee/self-role gate; record/state validation still applies. |
| A75 | POS active/open/close versus list | Current-user session scope for actions; optional explicit userId for list. |
| A76 | Stock UI/API roles and stored adjust_stock flag | Preserve three conflicting gates and fresh-login permissions omission. |
| A77 | ROLES/select/header with inventory_admin/customer | Nine selectable display roles, fallback labels; no invented customer option. |
| A78 | Login/Users/Profile last-login presentation | lastLogin returned; lastLoginAt UI remains absent/Never as coded. |
| A79 | 101 combined requests across auth endpoints within one limiter window | 429 configured text, shared budget, standard headers, no user counter increment if limiter blocks before controller. |
| A80 C | Parser errors in declared Zod version; production/nonproduction | Expected generic Validation failed concern; preserve envelope/stack null versus string. |
| A81 | Forbidden role submits invalid body to a standard role-gated API | Authorization precedes route Zod where declared; distinguish register special case. |
| A82 | Public print-json versus protected receipt | Public API has no bearer requirement; frontend receipt excludes customer. No print content changed in this task. |
| A83 C | User removed between protect and /me second read | Capture success data:null race, distinct from protect’s missing-user 401. |
| A84 | Save unchanged password during login failure/success | Hash remains byte-identical while timestamp/counters change; changed password hashes once. |

## 16. Exact original files involved

Paths below refer exclusively to the read-only original folder. Core files were read for behaviour; all route files were checked for authorization metadata; peripheral controllers/pages were read or searched only for identity, role/permission checks and verification integration. Copy variants are not the active layout sources. Real .env files, original setup scripts and dependency contents were not used.

| Original file | Inspection purpose |
| --- | --- |
| [backend/package.json](../../Ware-House-System-main/backend/package.json) | Core backend contract |
| [backend/src/config/db.js](../../Ware-House-System-main/backend/src/config/db.js) | Core backend contract |
| [backend/src/controllers/authController.js](../../Ware-House-System-main/backend/src/controllers/authController.js) | Core backend contract |
| [backend/src/controllers/customerController.js](../../Ware-House-System-main/backend/src/controllers/customerController.js) | Controller access/identity checks only |
| [backend/src/controllers/hrController.js](../../Ware-House-System-main/backend/src/controllers/hrController.js) | Controller access/identity checks only |
| [backend/src/controllers/payrollController.js](../../Ware-House-System-main/backend/src/controllers/payrollController.js) | Controller access/identity checks only |
| [backend/src/controllers/posSessionController.js](../../Ware-House-System-main/backend/src/controllers/posSessionController.js) | Controller access/identity checks only |
| [backend/src/controllers/salesOrderController.js](../../Ware-House-System-main/backend/src/controllers/salesOrderController.js) | Controller access/identity checks only |
| [backend/src/controllers/userController.js](../../Ware-House-System-main/backend/src/controllers/userController.js) | Core backend contract |
| [backend/src/middleware/authMiddleware.js](../../Ware-House-System-main/backend/src/middleware/authMiddleware.js) | Core backend contract |
| [backend/src/middleware/errorMiddleware.js](../../Ware-House-System-main/backend/src/middleware/errorMiddleware.js) | Core backend contract |
| [backend/src/middleware/validateMiddleware.js](../../Ware-House-System-main/backend/src/middleware/validateMiddleware.js) | Core backend contract |
| [backend/src/models/User.js](../../Ware-House-System-main/backend/src/models/User.js) | Core backend contract |
| [backend/src/routes/authRoutes.js](../../Ware-House-System-main/backend/src/routes/authRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/bankRoutes.js](../../Ware-House-System-main/backend/src/routes/bankRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/billRoutes.js](../../Ware-House-System-main/backend/src/routes/billRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/bomRoutes.js](../../Ware-House-System-main/backend/src/routes/bomRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/brandRoutes.js](../../Ware-House-System-main/backend/src/routes/brandRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/categoryRoutes.js](../../Ware-House-System-main/backend/src/routes/categoryRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/chequeRoutes.js](../../Ware-House-System-main/backend/src/routes/chequeRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/creditNoteRoutes.js](../../Ware-House-System-main/backend/src/routes/creditNoteRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/customerGroupRoutes.js](../../Ware-House-System-main/backend/src/routes/customerGroupRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/customerReturnRoutes.js](../../Ware-House-System-main/backend/src/routes/customerReturnRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/customerRoutes.js](../../Ware-House-System-main/backend/src/routes/customerRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/damageRoutes.js](../../Ware-House-System-main/backend/src/routes/damageRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/expenseRoutes.js](../../Ware-House-System-main/backend/src/routes/expenseRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/financialReportRoutes.js](../../Ware-House-System-main/backend/src/routes/financialReportRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/fundTransferRoutes.js](../../Ware-House-System-main/backend/src/routes/fundTransferRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/grnRoutes.js](../../Ware-House-System-main/backend/src/routes/grnRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/hrRoutes.js](../../Ware-House-System-main/backend/src/routes/hrRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/invoiceRoutes.js](../../Ware-House-System-main/backend/src/routes/invoiceRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/paymentRoutes.js](../../Ware-House-System-main/backend/src/routes/paymentRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/payrollRoutes.js](../../Ware-House-System-main/backend/src/routes/payrollRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/posSessionRoutes.js](../../Ware-House-System-main/backend/src/routes/posSessionRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/productionOrderRoutes.js](../../Ware-House-System-main/backend/src/routes/productionOrderRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/productRoutes.js](../../Ware-House-System-main/backend/src/routes/productRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/purchaseOrderRoutes.js](../../Ware-House-System-main/backend/src/routes/purchaseOrderRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/repairRoutes.js](../../Ware-House-System-main/backend/src/routes/repairRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/reportsRoutes.js](../../Ware-House-System-main/backend/src/routes/reportsRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/salesOrderRoutes.js](../../Ware-House-System-main/backend/src/routes/salesOrderRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/settingsRoutes.js](../../Ware-House-System-main/backend/src/routes/settingsRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/stockRoutes.js](../../Ware-House-System-main/backend/src/routes/stockRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/supplierReturnRoutes.js](../../Ware-House-System-main/backend/src/routes/supplierReturnRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/supplierRoutes.js](../../Ware-House-System-main/backend/src/routes/supplierRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/uomRoutes.js](../../Ware-House-System-main/backend/src/routes/uomRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/userRoutes.js](../../Ware-House-System-main/backend/src/routes/userRoutes.js) | API access declarations (authorization only) |
| [backend/src/routes/warehouseRoutes.js](../../Ware-House-System-main/backend/src/routes/warehouseRoutes.js) | API access declarations (authorization only) |
| [backend/src/server.js](../../Ware-House-System-main/backend/src/server.js) | Core backend contract |
| [backend/src/utils/generateToken.js](../../Ware-House-System-main/backend/src/utils/generateToken.js) | Core backend contract |
| [backend/src/utils/seedDefaults.js](../../Ware-House-System-main/backend/src/utils/seedDefaults.js) | Core backend contract |
| [backend/src/validators/authValidator.js](../../Ware-House-System-main/backend/src/validators/authValidator.js) | Core backend contract |
| [frontend/package.json](../../Ware-House-System-main/frontend/package.json) | Core frontend auth/user/navigation |
| [frontend/src/api/axios.js](../../Ware-House-System-main/frontend/src/api/axios.js) | Core frontend auth/user/navigation |
| [frontend/src/App.jsx](../../Ware-House-System-main/frontend/src/App.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/layout/AppLayout.jsx](../../Ware-House-System-main/frontend/src/components/layout/AppLayout.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/layout/Header.jsx](../../Ware-House-System-main/frontend/src/components/layout/Header.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/layout/Sidebar.jsx](../../Ware-House-System-main/frontend/src/components/layout/Sidebar.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/ProtectedRoute.jsx](../../Ware-House-System-main/frontend/src/components/ProtectedRoute.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/ui/Button.jsx](../../Ware-House-System-main/frontend/src/components/ui/Button.jsx) | Core frontend auth/user/navigation |
| [frontend/src/components/ui/Modal.jsx](../../Ware-House-System-main/frontend/src/components/ui/Modal.jsx) | Core frontend auth/user/navigation |
| [frontend/src/features/auth/AdminVerificationModal.jsx](../../Ware-House-System-main/frontend/src/features/auth/AdminVerificationModal.jsx) | Core frontend auth/user/navigation |
| [frontend/src/features/auth/authApi.js](../../Ware-House-System-main/frontend/src/features/auth/authApi.js) | Core frontend auth/user/navigation |
| [frontend/src/features/auth/authSchemas.js](../../Ware-House-System-main/frontend/src/features/auth/authSchemas.js) | Core frontend auth/user/navigation |
| [frontend/src/features/auth/useAdminVerify.js](../../Ware-House-System-main/frontend/src/features/auth/useAdminVerify.js) | Core frontend auth/user/navigation |
| [frontend/src/features/users/roleConfig.js](../../Ware-House-System-main/frontend/src/features/users/roleConfig.js) | Core frontend auth/user/navigation |
| [frontend/src/features/users/UserFormModal.jsx](../../Ware-House-System-main/frontend/src/features/users/UserFormModal.jsx) | Core frontend auth/user/navigation |
| [frontend/src/features/users/usersApi.js](../../Ware-House-System-main/frontend/src/features/users/usersApi.js) | Core frontend auth/user/navigation |
| [frontend/src/features/users/useUsers.js](../../Ware-House-System-main/frontend/src/features/users/useUsers.js) | Core frontend auth/user/navigation |
| [frontend/src/main.jsx](../../Ware-House-System-main/frontend/src/main.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/BomDetailPage.jsx](../../Ware-House-System-main/frontend/src/pages/BomDetailPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/BomsPage.jsx](../../Ware-House-System-main/frontend/src/pages/BomsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/BrandsPage.jsx](../../Ware-House-System-main/frontend/src/pages/BrandsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/CategoriesPage.jsx](../../Ware-House-System-main/frontend/src/pages/CategoriesPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/CustomerGroupsPage.jsx](../../Ware-House-System-main/frontend/src/pages/CustomerGroupsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/CustomersPage.jsx](../../Ware-House-System-main/frontend/src/pages/CustomersPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/InvoiceDetailPage.jsx](../../Ware-House-System-main/frontend/src/pages/InvoiceDetailPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/InvoicesPage.jsx](../../Ware-House-System-main/frontend/src/pages/InvoicesPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/LeaveRequestsPage.jsx](../../Ware-House-System-main/frontend/src/pages/LeaveRequestsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/LoginPage.jsx](../../Ware-House-System-main/frontend/src/pages/LoginPage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/PriceCheckerPage.jsx](../../Ware-House-System-main/frontend/src/pages/PriceCheckerPage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/ProductionOrderDetailPage.jsx](../../Ware-House-System-main/frontend/src/pages/ProductionOrderDetailPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/ProductionOrdersPage.jsx](../../Ware-House-System-main/frontend/src/pages/ProductionOrdersPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/ProductsPage.jsx](../../Ware-House-System-main/frontend/src/pages/ProductsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/ProfilePage.jsx](../../Ware-House-System-main/frontend/src/pages/ProfilePage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/PurchaseOrderDetailPage.jsx](../../Ware-House-System-main/frontend/src/pages/PurchaseOrderDetailPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/PurchaseOrdersPage.jsx](../../Ware-House-System-main/frontend/src/pages/PurchaseOrdersPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/ReturnsPage.jsx](../../Ware-House-System-main/frontend/src/pages/ReturnsPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/RolesPage.jsx](../../Ware-House-System-main/frontend/src/pages/RolesPage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/SalesOrderDetailPage.jsx](../../Ware-House-System-main/frontend/src/pages/SalesOrderDetailPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/SalesOrdersPage.jsx](../../Ware-House-System-main/frontend/src/pages/SalesOrdersPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/StockAdjustmentPage.jsx](../../Ware-House-System-main/frontend/src/pages/StockAdjustmentPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/StockPage.jsx](../../Ware-House-System-main/frontend/src/pages/StockPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/SuppliersPage.jsx](../../Ware-House-System-main/frontend/src/pages/SuppliersPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/pages/UnauthorizedPage.jsx](../../Ware-House-System-main/frontend/src/pages/UnauthorizedPage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/UsersPage.jsx](../../Ware-House-System-main/frontend/src/pages/UsersPage.jsx) | Core frontend auth/user/navigation |
| [frontend/src/pages/WarehousesPage.jsx](../../Ware-House-System-main/frontend/src/pages/WarehousesPage.jsx) | Frontend role/permission flags; verification consumers where present |
| [frontend/src/store/authStore.js](../../Ware-House-System-main/frontend/src/store/authStore.js) | Core frontend auth/user/navigation |

## 17. Proposed Next.js file mapping

All proposed targets below are relative to Ware-House-System. No files in this table have been created. Use Node-capable Route Handlers for Mongoose/bcrypt/JWT. Keep response contracts and browser token semantics initially; do not replace them with cookie auth, external auth libraries, blanket middleware redirects or server-only role guesses as an incidental migration change.

| Original responsibility | Proposed target | Preservation requirement |
| --- | --- | --- |
| config/db.js | src/server/db/mongoose.js | Cached local-only connection, no production URI or implicit seed. No DB connection during this contract task. |
| models/User.js | src/server/models/User.js | Same schema/hooks/virtuals/index semantics; reload-safe registration. |
| authController.js | src/server/auth/auth-service.js | Register/login/me/logout/change/verify operations and order of checks. Explicit context replaces req.user without changing responses. |
| userController.js | src/server/users/user-service.js | Five-field update whitelist, query/filter/count shape, hard delete/self guard. |
| protect / authorize in authMiddleware.js | src/server/auth/require-user.js; src/server/auth/authorize.js | Header parsing, fresh user fetch, normalized protect errors, role gates and no permissions elevation. |
| authValidator.js / validateMiddleware.js | src/server/auth/auth-schemas.js; src/server/http/validate-body.js | Exact accepted fields, stripping and validation-error compatibility. |
| errorMiddleware.js | src/server/http/api-error.js | Status/message/stack and CastError/duplicate/model mappings. |
| generateToken.js | src/server/auth/token.js | Same id claim and lifetime/sign/verify semantics, server-only secrets. |
| server auth limiter | src/server/auth/auth-rate-limit.js | Shared auth-path budget and 429/header semantics; characterize runtime/process differences. |
| POST /api/auth/login | src/app/api/auth/login/route.js | Public validated login; exact 200/error shape. |
| POST /api/auth/register | src/app/api/auth/register/route.js | Conditional bootstrap/admin flow including characterized error precedence. |
| GET /api/auth/me | src/app/api/auth/me/route.js | Authenticated serialized user response; no new client session protocol. |
| POST /api/auth/logout | src/app/api/auth/logout/route.js | Protected no-op server logout; no token revocation added. |
| POST /api/auth/change-password | src/app/api/auth/change-password/route.js | Preserve controller/model password-rule split. |
| POST /api/auth/verify-admin | src/app/api/auth/verify-admin/route.js | Identity confirmation only, original caller token retained. |
| GET /api/users | src/app/api/users/route.js | Protect-only user listing, original filters/count behaviour. |
| GET/PUT/DELETE /api/users/:id | src/app/api/users/[id]/route.js | Read any authenticated; admin mutation; hard-delete self guard. |
| seedDefaults admin/bootstrap | src/server/bootstrap/seed-defaults.js | Explicitly controlled later local invocation; preserve count logic, never copy credentials or seed during import/build. Any startup-trigger deviation must be documented before implementation. |
| frontend main providers | src/app/providers.jsx | Client QueryClient/toasts and original retry/cache semantics. |
| authStore.js / api/axios.js | src/store/authStore.js; src/lib/api/axios.js | Client-only storage/401 behaviour; adapt API base without leaking secrets. |
| ProtectedRoute.jsx | src/components/auth/ProtectedRoute.jsx | Client session/role gate and redirect outcomes, with App Router adapter. |
| LoginPage / UnauthorizedPage | src/app/(public)/login/page.jsx; src/app/(public)/unauthorized/page.jsx; src/features/auth/components/LoginPage.jsx; UnauthorizedPage.jsx | Thin page wrappers and client forms; preserve destination choices and storage clearing. |
| AppLayout/Header/Sidebar | src/app/(erp)/layout.jsx; src/components/layout/* | Nine-role ERP client gate, actual menu filtering and logout behaviours. |
| UsersPage / RolesPage | src/app/(erp)/users/page.jsx; src/app/(erp)/roles/page.jsx; src/features/users/components/* | Nested admin UI gate, role display and current CRUD/query behaviour. |
| ProfilePage | src/app/(erp)/profile/page.jsx; src/features/users/components/ProfilePage.jsx | Preserve non-admin PUT rejection and password flow initially. |
| Price checker / receipt role guards | src/app/(standalone)/price-checker/page.jsx; src/app/(standalone)/receipt/[id]/page.jsx | Separate allowlists outside ERP shell. Content migration is outside this auth task. |
| authApi/authSchemas, useUsers/usersApi/UserFormModal/roleConfig | src/features/auth/*; src/features/users/* | Retain separate schemas, options, whitelist mismatch and query invalidation until approved otherwise. |
| AdminVerificationModal/useAdminVerify | src/features/auth/components/AdminVerificationModal.jsx; src/features/auth/hooks/useAdminVerify.js | Preserve callback/timing/role semantics; consumer wiring stays in stock/invoice/user UI. |
| Authorization across other APIs | Respective src/app/api/.../route.js importing shared guards | Use the exact section 8 matrix, not frontend capability labels. No ERP business rewrite in this task. |
| Future acceptance fixtures/tests | tests/auth/auth-contract.test.js; tests/auth/user-contract.test.js; tests/auth/authorization-matrix.test.js; tests/e2e/auth.spec.js | Specifications A01–A84; only new synthetic identities and local fixtures, no original DB/seed execution. |

Future implementation must place the user-provided local MongoDB value only in Ware-House-System/.env.local, exclude that file in its .gitignore and commit a safe placeholder .env.example. No environment file is created now.

### Completion boundary

Only this contract document was created. The original source and the completed structural audit were not modified. No tests were executed against the application, no original code was imported/executed for analysis, and no database was contacted. The findings above remain static-source contracts plus explicitly marked characterization cases. Stop before implementation.
