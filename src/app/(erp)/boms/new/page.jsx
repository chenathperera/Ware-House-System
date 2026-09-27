"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Save, Trash2 } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { productsApi } from "../../../../client/features/products/productsApi.js";
import {
  useBom,
  useCreateBom,
  useUpdateBom,
} from "../../../../client/features/boms/useBoms.js";

const blankComponent = {
  productId: "",
  quantity: 1,
  wastagePercent: 0,
  standardCost: 0,
  componentType: "raw_material",
};
const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function BomFormPage() {
  const { id } = useParams();
  const router = useRouter();
  const editing = Boolean(id);
  const create = useCreateBom();
  const update = useUpdateBom();
  const { data: existing } = useBom(id);
  const [form, setForm] = useState({
    name: "",
    version: "1.0",
    finishedProductId: "",
    outputQuantity: 1,
    outputUnitOfMeasure: "",
    components: [blankComponent],
    labor: [],
    overheadPercent: 0,
    estimatedProductionTimeHours: 0,
    notes: "",
    status: "active",
    isDefault: true,
  });
  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productsApi.list({ limit: 500 }),
  });
  const products = productsData?.data || [];

  useEffect(() => {
    if (existing?.data) {
      const bom = existing.data;
      setForm({
        name: bom.name,
        version: bom.version || "1.0",
        finishedProductId: bom.finishedProductId?._id || bom.finishedProductId,
        outputQuantity: bom.outputQuantity,
        outputUnitOfMeasure: bom.outputUnitOfMeasure || "",
        components: bom.components.map((item) => ({
          productId: item.productId?._id || item.productId,
          quantity: item.quantity,
          wastagePercent: item.wastagePercent || 0,
          standardCost: item.standardCost || 0,
          componentType: item.componentType || "raw_material",
        })),
        labor: bom.labor || [],
        overheadPercent: bom.overheadPercent || 0,
        estimatedProductionTimeHours: bom.estimatedProductionTimeHours || 0,
        notes: bom.notes || "",
        status: bom.status,
        isDefault: bom.isDefault,
      });
    }
  }, [existing]);

  const finishedOptions = products
    .filter(
      (item) =>
        item.canBeManufactured ||
        ["finished_good", "semi_finished"].includes(item.productType),
    )
    .map((item) => ({
      value: item._id,
      label: `${item.name} (${item.productCode})`,
    }));
  const componentOptions = products
    .filter((item) =>
      ["raw_material", "packaging", "semi_finished", "consumable"].includes(
        item.productType,
      ),
    )
    .map((item) => ({
      value: item._id,
      label: `${item.name} · ${item.productCode}`,
    }));
  const totals = useMemo(() => {
    const material = form.components.reduce(
      (sum, item) =>
        sum +
        (+item.quantity || 0) *
          (1 + (+item.wastagePercent || 0) / 100) *
          (+item.standardCost || 0),
      0,
    );
    const labor = form.labor.reduce(
      (sum, item) => sum + (+item.hours || 0) * (+item.hourlyRate || 0),
      0,
    );
    const overhead = ((material + labor) * (+form.overheadPercent || 0)) / 100;
    return { material, labor, overhead, total: material + labor + overhead };
  }, [form]);
  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const updateComponent = (index, field, value) =>
    setForm((current) => {
      const components = [...current.components];
      components[index] = { ...components[index], [field]: value };
      if (field === "productId") {
        const product = products.find((item) => item._id === value);
        if (product) {
          components[index].standardCost =
            product.costs?.averageCost ||
            product.costs?.lastPurchaseCost ||
            product.basePrice ||
            0;
          components[index].componentType =
            product.productType === "packaging"
              ? "packaging"
              : product.productType === "semi_finished"
                ? "semi_finished"
                : "raw_material";
        }
      }
      return { ...current, components };
    });
  const submit = async () => {
    if (!form.name || !form.finishedProductId)
      return toast.error("Name and finished product required");
    if (
      form.components.length === 0 ||
      form.components.some((item) => !item.productId || !item.quantity)
    )
      return toast.error("Each component needs a product and quantity");
    const payload = {
      ...form,
      outputQuantity: +form.outputQuantity,
      overheadPercent: +form.overheadPercent || 0,
      estimatedProductionTimeHours: +form.estimatedProductionTimeHours || 0,
      components: form.components.map((item) => ({
        ...item,
        quantity: +item.quantity,
        wastagePercent: +item.wastagePercent || 0,
        standardCost: +item.standardCost || 0,
      })),
      labor: form.labor
        .filter((item) => item.hours > 0)
        .map((item) => ({
          ...item,
          hours: +item.hours,
          hourlyRate: +item.hourlyRate || 0,
        })),
    };
    const result = editing
      ? await update.mutateAsync({ id, data: payload })
      : await create.mutateAsync(payload);
    router.push(`/boms/${editing ? id : result.data._id}`);
  };

  return (
    <div>
      <PageHeader
        title={editing ? "Edit BOM" : "New Bill of Materials"}
        description="Define how a finished product is made"
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <Input
              label="Recipe Name"
              required
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
            />
            <Select
              label="Finished Product"
              required
              options={finishedOptions}
              value={form.finishedProductId}
              onChange={(event) =>
                setField("finishedProductId", event.target.value)
              }
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Input
                label="Version"
                value={form.version}
                onChange={(event) => setField("version", event.target.value)}
              />
              <Input
                label="Output Quantity (per batch)"
                type="number"
                value={form.outputQuantity}
                onChange={(event) =>
                  setField("outputQuantity", event.target.value)
                }
              />
              <Input
                label="Unit of Measure"
                value={form.outputUnitOfMeasure}
                onChange={(event) =>
                  setField("outputUnitOfMeasure", event.target.value)
                }
              />
            </div>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex justify-between">
              <h3>Components / Raw Materials</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setField("components", [...form.components, blankComponent])
                }
              >
                <Plus size={14} /> Add Component
              </Button>
            </div>
            {form.components.map((item, index) => (
              <div
                key={index}
                className="mb-3 grid grid-cols-[1fr_100px_100px_100px_auto] gap-2"
              >
                <Select
                  options={componentOptions}
                  value={item.productId}
                  onChange={(event) =>
                    updateComponent(index, "productId", event.target.value)
                  }
                />
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(event) =>
                    updateComponent(index, "quantity", event.target.value)
                  }
                />
                <Input
                  type="number"
                  value={item.wastagePercent}
                  onChange={(event) =>
                    updateComponent(index, "wastagePercent", event.target.value)
                  }
                />
                <Input
                  type="number"
                  value={item.standardCost}
                  onChange={(event) =>
                    updateComponent(index, "standardCost", event.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "components",
                      form.components.filter((_, row) => row !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>
          <Card className="p-6">
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </Card>
        </div>
        <Card className="h-fit p-6">
          <h3>Cost Summary</h3>
          <p>Material: {money(totals.material)}</p>
          <p>Labor: {money(totals.labor)}</p>
          <p>Overhead: {money(totals.overhead)}</p>
          <p>Total: {money(totals.total)}</p>
          <Button
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={submit}
            loading={create.isPending || update.isPending}
          >
            <Save size={16} /> Save BOM
          </Button>
        </Card>
      </div>
    </div>
  );
}
