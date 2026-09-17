"use client";
import { forwardRef } from "react";

const Textarea = forwardRef(
  ({ label, error, required = false, rows = 3, className = "", ...props }, ref) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full resize-y rounded-lg border px-3 py-2 transition focus:outline-none focus:ring-2 ${
            error
              ? "border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
          }`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
