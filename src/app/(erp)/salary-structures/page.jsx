"use client";

import { useState } from "react";
import { Calculator, Edit, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import {
  useCreateSalaryStructure,
  useDeleteSalaryStructure,
  useSalaryStructures,
  useUpdateSalaryStructure,
} from "../../../client/features/hr/useHr.js";

const emptyForm = { name: "", code: "", description: "", components: [] };

const componentTypes = [
  { value: "earning", label: "Earning" },
  { value: "deduction", label: "Deduction" },
];

const calculationTypes = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage_of_basic", label: "% of Basic" },
];

export default function SalaryStructuresPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const structuresQuery = useSalaryStructures();
  const createStructure = useCreateSalaryStructure();
  const updateStructure = useUpdateSalaryStructure();
  const deleteStructure = useDeleteSalaryStructure();
  const structures = structuresQuery.data?.data || [];

  const closeModal = () => {
    setIsOpen(false);
    setIsView(false);
  };

  const openNew = () => {
    setIsView(false);
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openStructure = (structure, viewOnly) => {
    setIsView(viewOnly);
    setEditing(structure);
    setForm({
      name: structure.name,
      code: structure.code || "",
      description: structure.description || "",
      components: structure.components || [],
    });
    setIsOpen(true);
  };

  const addComponent = () => {
    setForm((current) => ({
      ...current,
      components: [
        ...current.components,
        {
          name: "",
          type: "earning",
          calculationType: "fixed",
          amount: 0,
          percentage: 0,
          isTaxable: true,
          isStatutory: false,
        },
      ],
    }));
  };

  const updateComponent = (index, field, value) => {
    setForm((current) => {
      const components = [...current.components];
      components[index] = { ...components[index], [field]: value };
      return { ...current, components };
    });
  };

  const removeComponent = (index) => {
    setForm((current) => ({
      ...current,
      components: current.components.filter(
        (_, componentIndex) => componentIndex !== index,
      ),
    }));
  };

  const submit = async () => {
    if (!form.name) {
      toast.error("Name required");
      return;
    }

    try {
      const payload = {
        ...form,
        components: form.components.map((component) => ({
          ...component,
          amount: +component.amount || 0,
          percentage: +component.percentage || 0,
        })),
      };

      if (editing) {
        await updateStructure.mutateAsync({ id: editing._id, data: payload });
      } else {
        await createStructure.mutateAsync(payload);
      }
      setIsOpen(false);
    } catch {}
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (structure) => (
        <span className="font-medium">{structure.name}</span>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (structure) => (
        <span className="font-mono text-xs">{structure.code}</span>
      ),
    },
    {
      key: "components",
      label: "Components",
      render: (structure) => structure.components?.length || 0,
    },
    {
      key: "status",
      label: "Status",
      render: (structure) => (
        <Badge variant={structure.isActive ? "success" : "default"}>
          {structure.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (structure) => (
        <div className="flex gap-1">
          <button
            onClick={() => openStructure(structure, true)}
            className="rounded p-1.5 hover:bg-gray-100"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openStructure(structure, false)}
            className="rounded p-1.5 hover:bg-gray-100"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleting(structure)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Salary Structures"
        description="Define earnings and deductions templates"
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus size={16} className="mr-1.5" />
            Add Structure
          </Button>
        }
      />

      <Card>
        {structures.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="No structures defined"
            description="Create salary structures to standardize earnings/deductions across employees"
          />
        ) : (
          <Table columns={columns} data={structures} />
        )}
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={
          editing
            ? isView
              ? "View Salary Structure"
              : "Edit Salary Structure"
            : "New Salary Structure"
        }
        size="xl"
      >
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              disabled={isView}
              label="Name"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Input
              disabled={isView}
              label="Code"
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Components</h4>
              {!isView && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComponent}
                >
                  <Plus size={14} className="mr-1" />
                  Add Component
                </Button>
              )}
            </div>

            <p className="mb-3 text-xs text-gray-500">
              Earnings are added to gross pay. Deductions are subtracted. EPF,
              ETF and APIT are calculated automatically — you don&apos;t need to add
              them here.
            </p>

            <div className="space-y-2">
              {form.components.map((component, index) => (
                <div key={index} className="rounded border p-2">
                  <div className="grid grid-cols-5 items-end gap-2">
                    <Input
                      disabled={isView}
                      label="Name"
                      value={component.name}
                      onChange={(event) =>
                        updateComponent(index, "name", event.target.value)
                      }
                    />
                    <Select
                      disabled={isView}
                      label="Type"
                      options={componentTypes}
                      value={component.type}
                      onChange={(event) =>
                        updateComponent(index, "type", event.target.value)
                      }
                    />
                    <Select
                      disabled={isView}
                      label="Calc Type"
                      options={calculationTypes}
                      value={component.calculationType}
                      onChange={(event) =>
                        updateComponent(
                          index,
                          "calculationType",
                          event.target.value,
                        )
                      }
                    />
                    {component.calculationType === "fixed" ? (
                      <Input
                        disabled={isView}
                        label="Amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={component.amount}
                        onChange={(event) =>
                          updateComponent(index, "amount", event.target.value)
                        }
                      />
                    ) : (
                      <Input
                        disabled={isView}
                        label="Percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={component.percentage}
                        onChange={(event) =>
                          updateComponent(
                            index,
                            "percentage",
                            event.target.value,
                          )
                        }
                      />
                    )}
                    <button
                      onClick={() => removeComponent(index)}
                      className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      disabled={isView}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        disabled={isView}
                        checked={component.isTaxable}
                        onChange={(event) =>
                          updateComponent(
                            index,
                            "isTaxable",
                            event.target.checked,
                          )
                        }
                      />
                      Taxable
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant={isView ? "primary" : "outline"} onClick={closeModal}>
            {isView ? "Close" : "Cancel"}
          </Button>
          {!isView && (
            <Button
              variant="primary"
              onClick={submit}
              loading={createStructure.isPending || updateStructure.isPending}
            >
              {editing ? "Update" : "Create"}
            </Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteStructure.mutateAsync(deleting._id);
          setDeleting(null);
        }}
        title="Delete Structure"
        message={`Delete "${deleting?.name}"?`}
        variant="danger"
      />
    </div>
  );
}
