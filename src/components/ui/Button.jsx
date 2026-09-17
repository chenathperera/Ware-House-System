"use client";
export default function Button({ children, type = "button", variant = "primary", size = "md", loading = false, disabled = false, fullWidth = false, onClick, className = "", ...props }) {
  const variants = { primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500", secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300", danger: "bg-red-600 text-white hover:bg-red-700", outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50", ghost: "text-gray-700 hover:bg-gray-100" };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return <button type={type} onClick={onClick} disabled={disabled || loading} className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>{loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}{children}</button>;
}
