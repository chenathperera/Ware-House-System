export const ERP_ROLES = [
  "admin",
  "manager",
  "accountant",
  "sales_manager",
  "sales_rep",
  "warehouse_staff",
  "production_staff",
  "inventory_admin",
  "staff",
];
export const PRICE_CHECKER_ROLES = ["customer", "admin", "manager", "inventory_admin", "staff"];

export function getLoginDestination(user) {
  return user?.role === "customer" ? "/price-checker" : "/dashboard";
}

export function getProtectedRouteDecision({ isAuthenticated, user, allowedRoles }) {
  if (!isAuthenticated) return "login";
  if (!user) return "pending";
  if (allowedRoles && !allowedRoles.includes(user.role)) return "unauthorized";
  return "allow";
}
