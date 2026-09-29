"use client";

import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Factory,
  Package,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import Card from "../ui/Card.jsx";
import PageHeader from "../ui/PageHeader.jsx";

const reportGroups = [
  {
    category: "Sales",
    color: "text-blue-600",
    bg: "bg-blue-50",
    reports: [
      [
        "Sales Summary",
        "Overall sales metrics for a period",
        "/reports/sales",
        TrendingUp,
      ],
      [
        "Sales by Product",
        "Top and bottom performing products",
        "/reports/sales-by-product",
        Package,
      ],
      [
        "Sales by Customer",
        "Customer revenue and outstanding balances",
        "/reports/sales-by-customer",
        Users,
      ],
    ],
  },
  {
    category: "Inventory",
    color: "text-green-600",
    bg: "bg-green-50",
    reports: [
      [
        "Stock Valuation",
        "Total inventory value per product and warehouse",
        "/reports/stock-valuation",
        DollarSign,
      ],
      [
        "Slow & Fast Movers",
        "ABC analysis + identify dead stock",
        "/reports/slow-fast-movers",
        TrendingUp,
      ],
      [
        "Low Stock Items",
        "Products at or below reorder level",
        "/reports/inventory/low-stock",
        Package,
      ],
      [
        "Stock Movement Log",
        "Audit trail of all stock movements",
        "/reports/stock-movement",
        Factory,
      ],
    ],
  },
  {
    category: "Production",
    color: "text-purple-600",
    bg: "bg-purple-50",
    reports: [
      [
        "Production Summary",
        "Output, yield, cost variance, wastage",
        "/reports/production",
        Factory,
      ],
    ],
  },
  {
    category: "Returns & Damages",
    color: "text-orange-600",
    bg: "bg-orange-50",
    reports: [
      [
        "Returns & Damages",
        "Return reasons, damage sources, value lost",
        "/reports/returns-damages",
        RotateCcw,
      ],
    ],
  },
  {
    category: "Financial",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    reports: [
      [
        "Financial Snapshot",
        "Revenue vs expenses, A/R + A/P aging, cash flow",
        "/reports/financial",
        DollarSign,
      ],
    ],
  },
  {
    category: "Human Resources",
    color: "text-pink-600",
    bg: "bg-pink-50",
    reports: [
      [
        "HR Reports",
        "Headcount, attendance, leave patterns, payroll summary",
        "/reports/hr",
        Users,
      ],
    ],
  },
];

export default function ReportsHub() {
  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Business intelligence for your operations"
      />
      <div className="space-y-8">
        {reportGroups.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              {group.category}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.reports.map(([title, description, path, Icon]) => (
                <Link key={title} href={path}>
                  <Card className="cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-start gap-3">
                      <div
                        className={`${group.bg} ${group.color} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{title}</h3>
                          <ArrowRight size={12} className="text-gray-400" />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
