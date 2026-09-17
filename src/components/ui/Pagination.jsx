"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function Pagination({ page, totalPages, onPageChange, total }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
      <p className="text-sm text-gray-600">
        Page <b>{page}</b> of <b>{totalPages}</b>
        {total !== undefined && <span className="ml-2 text-gray-400">({total} total)</span>}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
