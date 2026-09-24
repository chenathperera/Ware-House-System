"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Factory,
  Landmark,
  LayoutDashboard,
  Package,
  PackageCheck,
  PanelLeftClose,
  Plus,
  Receipt,
  ShoppingBag,
  Settings,
  ShoppingCart,
  Users as UsersIcon,
} from "lucide-react";
const menuItems = [
  { label: "Dashboard", id: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "People",
    id: "people",
    icon: UsersIcon,
    children: [
      ["Customers", "/customers"],
      ["Suppliers", "/suppliers"],
      ["Staff / Users", "/users", true],
      ["User Roles", "/roles", true],
      ["Customer Groups", "/customer-groups"],
    ],
  },
  {
    label: "Sales",
    id: "sales",
    icon: ShoppingCart,
    children: [
      ["POS Terminal", "/pos"],
      ["POS Registers", "/pos-sessions"],
      ["Sales Orders", "/sales-orders"],
      ["Wholesale Prices", "/wholesale-prices"],
      ["Invoices", "/invoices"],
      
      ["Customer Returns", "/returns"],
      ["Repairs Workshop", "/repairs"],
    ],
  },
  {
    label: "Inventory",
    id: "inventory",
    icon: Package,
    children: [
      ["Products", "/products"],
      ["Categories", "/categories"],
      ["Brands", "/brands"],
      ["Stock Levels", "/stock"],
      ["Opening Stock", "/stock/opening"],
      ["Warehouses", "/warehouses"],
      ["Stock Transfers", "/stock/transfer"],
      ["Stock Adjustment", "/stock/adjustment"],
      ["Stock Movements", "/stock/movements"],
      ["Damages Register", "/damages"],
      ["Price Checker", "/price-checker"],
    ],
  },
  {
    label: "Procurement",
    id: "procurement",
    icon: ShoppingBag,
    children: [
      ["Purchase Orders", "/purchase-orders"],
      ["Goods Received (GRN)", "/grns"],
      ["Supplier Returns", "/supplier-returns"],
      ["Purchase Bills", "/bills"],
    ],
  },
  {
  label: "Finance",
  id: "finance",
  icon: Landmark,
  children: [
    ["Bank Accounts", "/bank-accounts"],
    ["Payments", "/payments"],
    ["Expenses", "/expenses"],
    ["Fund Transfers", "/fund-transfers"],
    ["Cheque Registry", "/cheques"],
    ["Credit Notes", "/credit-notes"],
  ],
},
  {
    label: "Manufacturing",
    id: "production",
    icon: Factory,
    children: [
      ["BOMs (Recipes)", "/boms"],
      ["Production Orders", "/production-orders"],
    ],
  },
  {
    label: "HR & Payroll",
    id: "hr",
    icon: Building2,
    children: [
      ["Employees", "/employees"],
      ["Departments", "/departments"],
      ["Designations", "/designations"],
      ["Shifts", "/shifts"],
      ["Attendance", "/attendance"],
      ["Leave Requests", "/leaves"],
      ["Holidays", "/holidays"],
      ["Salary Structures", "/salary-structures"],
      ["Payroll Management", "/payroll"],
    ],
  },
  { label: "Analytics", id: "analytics", icon: BarChart3, path: "/reports" },
  { label: "Settings", id: "settings", icon: Settings, path: "/settings" },
];
export default function Sidebar({ userRole, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState({});
  const [newOpen, setNewOpen] = useState(false);
  useEffect(() => {
    setExpanded((old) => ({
      ...old,
      ...Object.fromEntries(
        menuItems
          .filter((item) => item.children?.some(([, path]) => pathname === path))
          .map((item) => [item.id, true]),
      ),
    }));
  }, [pathname]);
  const visible = menuItems.map((item) => ({
    ...item,
    children: item.children?.filter(([, , admin]) => !admin || userRole === "admin"),
  }));
  const newActions = [
    ["New Invoice", "/invoices/new", Receipt],
    ["New Sales Order", "/sales-orders/new", ShoppingCart],
    ["New GRN", "/grns", PackageCheck],
    ["New Customer", "/customers", UsersIcon],
  ];
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-gray-900/10 backdrop-blur-[2px] lg:hidden ${isOpen ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r border-gray-100 bg-white shadow-sm transition-all duration-300 lg:relative ${isOpen ? "w-[280px] translate-x-0" : "w-0 -translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full w-[280px] flex-col bg-white">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-100">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">RC Traders</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
              <PanelLeftClose size={18} />
            </button>
          </div>
          <div className="relative mb-4 px-6">
            <button
              onClick={() => setNewOpen(!newOpen)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium ${newOpen ? "bg-indigo-600 text-white" : "border border-gray-100 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              <span className="flex items-center gap-3">
                <Plus size={18} />
                New
              </span>
              <ChevronDown size={14} />
            </button>
            {newOpen && (
              <div className="absolute left-6 right-6 top-full z-50 mt-2 rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
                {newActions.map(([label, path, Icon]) => (
                  <button
                    key={path}
                    onClick={() => {
                      router.push(path);
                      setNewOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-2">
            {visible.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.path || item.children?.some(([, path]) => pathname === path);
              return (
                <div key={item.id}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => setExpanded((old) => ({ ...old, [item.id]: !old[item.id] }))}
                        className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {active && (
                          <i className="absolute left-0 h-6 w-1 rounded-r-full bg-indigo-600" />
                        )}
                        <Icon size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
                        {item.label}
                        <span className="ml-auto">
                          {expanded[item.id] ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </span>
                      </button>
                      {expanded[item.id] && (
                        <div className="ml-9 mt-1 space-y-1 border-l border-gray-100">
                          {item.children.map(([label, path]) => (
                            <Link
                              key={path}
                              href={path}
                              className={`block rounded-lg px-4 py-2 text-sm font-medium ${pathname === path ? "text-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
                            >
                              {label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.path}
                      className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      {active && (
                        <i className="absolute left-0 h-6 w-1 rounded-r-full bg-indigo-600" />
                      )}
                      <Icon size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="border-t border-gray-50 p-4">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {userRole?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-semibold capitalize text-gray-900">{userRole}</p>
                <p className="text-[11px] text-gray-500">Main Branch</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
