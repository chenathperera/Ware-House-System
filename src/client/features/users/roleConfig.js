export const ROLES = [
  [
    "admin",
    "Administrator",
    "Full system access, can manage users and all operations",
    "#dc2626",
    ["all"],
  ],
  [
    "manager",
    "Manager",
    "Operational oversight, approvals, most actions allowed",
    "#ea580c",
    ["approve_orders", "approve_credits", "manage_products", "view_reports"],
  ],
  [
    "accountant",
    "Accountant",
    "Handles invoicing, payments, credit control",
    "#059669",
    ["invoicing", "payments", "credit_holds", "view_financial_reports"],
  ],
  [
    "sales_manager",
    "Sales Manager",
    "Manages sales team, orders, customer relationships",
    "#2563eb",
    ["approve_orders", "manage_customers", "view_sales_reports"],
  ],
  [
    "sales_rep",
    "Sales Rep",
    "Creates orders, manages assigned customers only",
    "#7c3aed",
    ["create_orders", "view_own_customers"],
  ],
  [
    "warehouse_staff",
    "Warehouse Staff",
    "Handles stock, dispatch, and goods receipt",
    "#0891b2",
    ["manage_stock", "dispatch_orders", "receive_grn"],
  ],
  [
    "production_staff",
    "Production Staff",
    "Manages BOMs and production orders",
    "#c026d3",
    ["manage_bom", "run_production"],
  ],
  [
    "inventory_admin",
    "Inventory Admin",
    "Exclusive access to adjust stock levels and manage catalog",
    "#b91c1c",
    ["adjust_stock", "manage_stock", "manage_products"],
  ],
  ["staff", "Staff", "View-only access to most modules", "#64748b", ["view_only"]],
].map(([value, label, description, color, permissions]) => ({
  value,
  label,
  description,
  color,
  permissions,
}));
export const getRoleConfig = (roleValue) =>
  ROLES.find((role) => role.value === roleValue) || ROLES[ROLES.length - 1];
