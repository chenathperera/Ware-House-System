"use client";

import { useState } from "react";
import { Calculator, Plus, Save, Search, Trash2 } from "lucide-react";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import {
  useProducts,
  useUpdateProduct,
} from "../../../client/features/products/useProducts.js";

export default function WholesalePricesPage() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [tiers, setTiers] = useState([]);
  const { data, isLoading } = useProducts({ search });
  const updateProduct = useUpdateProduct();
  const products = data?.data || [];

  const startEdit = (product) => {
    setEditingId(product._id);
    setTiers(product.tierPricing || []);
  };
  const changeTier = (index, field, value) =>
    setTiers((current) =>
      current.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, [field]: value } : tier,
      ),
    );
  const save = async (product) => {
    try {
      await updateProduct.mutateAsync({
        id: product._id,
        data: {
          tierPricing: tiers,
        },
      });
      setEditingId(null);
    } catch {
      // Error handled by hook.
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Wholesale Price Management
        </h1>
        <p className="text-gray-500">
          Manage tiered pricing tables for all products in one place.
        </p>
      </div>
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>
      <div className="grid gap-6">
        {isLoading ? (
          <div className="py-12 text-center">Loading...</div>
        ) : (
          products.map((product) => {
            const editing = editingId === product._id;
            return (
              <Card key={product._id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b bg-gray-50 p-4">
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="font-mono text-xs text-gray-500">
                      {product.productCode} | Buying Price: LKR{" "}
                      {(product.costs?.standardCost || 0).toLocaleString()}
                    </p>
                  </div>
                  {editing ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={updateProduct.isPending}
                        onClick={() => save(product)}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Save Prices
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(product)}
                    >
                      <Calculator className="mr-1 h-4 w-4" />
                      Manage Prices
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  {editing ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                              <th>Tier Name</th>
                              <th>Min Qty</th>
                              <th>Max Qty</th>
                              <th>Price</th>
                              <th>Profit</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {tiers.map((tier, index) => {
                              const cost = product.costs?.standardCost || 0;
                              const profit = cost
                                ? (
                                    ((tier.price - cost) / cost) *
                                    100
                                  ).toFixed(2)
                                : 0;
                              return (
                                <tr key={index}>
                                  <td>
                                    <input
                                      className="w-full border p-1"
                                      value={tier.tierName}
                                      onChange={(event) =>
                                        changeTier(
                                          index,
                                          "tierName",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      className="w-20 border p-1"
                                      type="number"
                                      value={tier.minQuantity}
                                      onChange={(event) =>
                                        changeTier(
                                          index,
                                          "minQuantity",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      className="w-20 border p-1"
                                      type="number"
                                      value={tier.maxQuantity || ""}
                                      onChange={(event) =>
                                        changeTier(
                                          index,
                                          "maxQuantity",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      className="w-28 border p-1"
                                      type="number"
                                      value={tier.price}
                                      onChange={(event) =>
                                        changeTier(
                                          index,
                                          "price",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td>{profit}%</td>
                                  <td>
                                    <button
                                      className="text-red-600"
                                      onClick={() =>
                                        setTiers((current) =>
                                          current.filter(
                                            (_, tierIndex) =>
                                              tierIndex !== index,
                                          ),
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() =>
                          setTiers((current) => [
                            ...current,
                            {
                              tierName: product.name,
                              minQuantity: 1,
                              maxQuantity: null,
                              price: 0,
                            },
                          ])
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add New Price Tier
                      </Button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg border border-primary-100 bg-primary-50 p-3">
                        <p className="text-xs font-bold uppercase text-primary-400">
                          Retail / Base
                        </p>
                        <p className="text-lg font-bold text-primary-700">
                          LKR {product.basePrice?.toLocaleString()}
                        </p>
                      </div>
                      {product.tierPricing?.map((tier, index) => (
                        <div key={index} className="rounded-lg border p-3">
                          <p className="text-xs font-bold uppercase text-gray-400">
                            {tier.tierName || `Qty ${tier.minQuantity}+`}
                          </p>
                          <p className="text-lg font-bold">
                            LKR {tier.price?.toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {(!product.tierPricing || product.tierPricing.length === 0) && (
                        <div className="col-span-3 flex items-center text-sm italic text-gray-400">
                          No additional wholesale tiers defined.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
