"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Button from "../ui/Button.jsx";
import PageHeader from "../ui/PageHeader.jsx";

export const money = (value, digits = 2) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: digits,
  }).format(value || 0);
export const number = (value) =>
  new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(
    value || 0,
  );
export const today = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
};

export function ReportHeader({ title, description, actions }) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <div className="flex gap-2">
          <Link href="/reports">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
          </Link>
          {actions}
        </div>
      }
    />
  );
}

export function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}
