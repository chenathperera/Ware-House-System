"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Package,
  Search,
  ShoppingBag,
  Tag,
  X,
} from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute.jsx";
import { PRICE_CHECKER_ROLES } from "../../client/auth/access.js";
import { useProducts } from "../../client/features/products/useProducts.js";
import { useAuthStore } from "../../client/store/authStore.js";

function ProductSearchResults({ isLoading, products, search, onSearch, onSelect }) {
  return (
    <div className="space-y-8">
      <div className="w-full">
        <div className="flex items-center rounded-3xl border border-gray-100 bg-white p-2 shadow-2xl shadow-primary-900/10 transition-all focus-within:ring-4 focus-within:ring-primary-500/10">
          <div className="p-3">
            <Search className="h-7 w-7 text-primary-500" />
          </div>
          <input
            type="text"
            className="flex-1 border-none bg-transparent py-3 pr-4 text-xl font-bold text-gray-900 outline-none placeholder:text-gray-400 md:text-2xl"
            placeholder="Search products..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            autoFocus
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="mr-2 rounded-full p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white/80"
            />
          ))
        ) : products.length > 0 ? (
          products.map((product) => (
            <button
              key={product._id}
              onClick={() => onSelect(product)}
              className="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white/95 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-900/5 md:gap-6 md:p-5"
            >
              <div className="flex-shrink-0 rounded-2xl bg-primary-50 p-3 text-primary-600 transition-all duration-300 group-hover:bg-primary-600 group-hover:text-white">
                <ShoppingBag size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    {product.productCode}
                  </span>
                  {product.sku && (
                    <span className="text-[9px] font-bold text-gray-300">SKU: {product.sku}</span>
                  )}
                </div>
                <h3 className="truncate text-lg font-black leading-tight text-gray-900 transition-colors group-hover:text-primary-600 md:text-xl">
                  {product.name}
                </h3>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Retail Price</p>
                <p className="text-lg font-black italic leading-none text-primary-600 md:text-2xl">
                  LKR {product.basePrice?.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-all group-hover:bg-primary-600 group-hover:text-white">
                <ChevronRight size={24} />
              </div>
            </button>
          ))
        ) : search ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white/60 py-20 text-center">
            <p className="text-lg font-bold text-gray-500">No results for &quot;{search}&quot;</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductPriceDetail({ product, onBack }) {
  return (
    <div className="mx-auto w-full max-w-3xl animate-in zoom-in-95 fade-in pb-10 duration-300">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-black text-gray-900 shadow-md transition-all hover:shadow-lg md:text-sm"
      >
        <ArrowLeft size={16} />
        BACK TO RESULTS
      </button>

      <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-primary-600 to-blue-700 p-8 text-white md:p-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                <Tag size={12} />
                OFFICIAL WHOLESALE PRICE
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">{product.name}</h2>
              <p className="w-fit rounded-lg border border-white/10 bg-black/20 px-2.5 py-0.5 font-mono text-sm font-bold text-primary-200">
                {product.productCode}
              </p>
            </div>
            <div className="flex min-w-[180px] flex-col items-end rounded-3xl bg-white p-5 shadow-xl">
              <p className="mb-0.5 text-[10px] font-black uppercase text-gray-400">Base Retail</p>
              <p className="text-2xl font-black italic text-primary-600 md:text-3xl">
                LKR {product.basePrice?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 bg-white p-8 md:p-10">
          {product.description && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</h4>
              <p className="text-base font-medium text-gray-700 md:text-lg">{product.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bulk Price Tiers</h4>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">
                Units in {product.unitOfMeasure?.name || "PCS"}
              </span>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-base font-black text-primary-600 shadow-sm">
                    1
                  </div>
                  <p className="text-sm font-bold text-gray-900">Retail Price</p>
                </div>
                <p className="text-lg font-black italic text-gray-900 md:text-xl">
                  LKR {product.basePrice?.toLocaleString()}
                </p>
              </div>
              {product.tierPricing?.map((tier, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-2xl border border-primary-100 bg-primary-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-base font-black text-white shadow-md">
                      {tier.minQuantity}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary-900">{tier.tierName || "Bulk Price"}</p>
                      <p className="text-[9px] font-bold uppercase text-primary-600">Min Qty: {tier.minQuantity}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black italic text-primary-700 md:text-xl">
                    LKR {tier.price?.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {product.mrp > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 opacity-70">
              <p className="text-[9px] font-black uppercase italic tracking-widest text-red-400">Manufacturer MRP</p>
              <span className="text-base font-black italic text-gray-300 line-through decoration-red-400/30">
                LKR {product.mrp?.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceCheckerContent() {
  const { logout } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { data: productsData, isLoading } = useProducts({ search, limit: 40 });
  const products = productsData?.data || [];

  const selectProduct = (product) => {
    setSelectedProduct(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative z-0 flex min-h-screen flex-col bg-slate-50 antialiased selection:bg-primary-500 selection:text-white">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/80 to-primary-100/40" />
      </div>

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-200">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-black leading-none tracking-tight text-gray-900">
            RISHAN <span className="text-primary-600">WHOLESALE</span>
          </h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white"
        >
          <LogOut size={16} />
          <span>Exit</span>
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">
        {selectedProduct ? (
          <ProductPriceDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
        ) : (
          <ProductSearchResults
            isLoading={isLoading}
            products={products}
            search={search}
            onSearch={setSearch}
            onSelect={selectProduct}
          />
        )}
      </main>

      <footer className="mt-auto p-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-40">
          RISHAN WHOLESALE ERP
        </p>
      </footer>
    </div>
  );
}

export default function PriceCheckerPage() {
  return (
    <ProtectedRoute allowedRoles={PRICE_CHECKER_ROLES}>
      <PriceCheckerContent />
    </ProtectedRoute>
  );
}
