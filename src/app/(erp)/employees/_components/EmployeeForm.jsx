"use client";
/* eslint-disable react-hooks/set-state-in-effect -- source-parity edit-form hydration */

import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import {
  useCreateEmployee,
  useDepartments,
  useDesignations,
  useEmployee,
  useShifts,
  useUpdateEmployee,
} from "../../../../client/features/hr/useHr.js";

const tabs = [
  ["basic", "Basic Info"],
  ["contact", "Contact"],
  ["employment", "Employment"],
  ["statutory", "Statutory & Bank"],
  ["compensation", "Compensation"],
];
const initialForm = () => ({
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  nationalIdNumber: "",
  maritalStatus: "",
  nationality: "Sri Lankan",
  bloodGroup: "",
  email: "",
  phone: "",
  mobile: "",
  permanentAddress: { line1: "", city: "", postalCode: "" },
  currentAddress: { line1: "", city: "", postalCode: "" },
  emergencyContact: { name: "", relationship: "", phone: "" },
  departmentId: "",
  designationId: "",
  reportsToId: "",
  employmentType: "permanent",
  dateOfJoining: "",
  probationEndDate: "",
  workLocation: "",
  workShift: "",
  epfNumber: "",
  etfNumber: "",
  taxRegistrationNumber: "",
  bankDetails: { bankName: "", branchName: "", accountNumber: "", accountName: "" },
  salaryStructureId: "",
  basicSalary: 0,
  commissionRate: 0,
  status: "active",
  notes: "",
});
const options = (values) => values.map(([value, label]) => ({ value, label }));
const dateValue = (value) => (value ? value.slice(0, 10) : "");

export default function EmployeeForm({ id }) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState(initialForm);
  const { data: existing } = useEmployee(id);
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  useEffect(() => { const employee = existing?.data; if (!employee) return; setForm((previous) => ({ ...previous, ...employee, dateOfBirth: dateValue(employee.dateOfBirth), dateOfJoining: dateValue(employee.dateOfJoining), probationEndDate: dateValue(employee.probationEndDate), departmentId: employee.departmentId?._id || "", designationId: employee.designationId?._id || "", reportsToId: employee.reportsToId?._id || "", workShift: employee.workShift?._id || "", salaryStructureId: employee.salaryStructureId?._id || "", permanentAddress: employee.permanentAddress || previous.permanentAddress, currentAddress: employee.currentAddress || previous.currentAddress, emergencyContact: employee.emergencyContact || previous.emergencyContact, bankDetails: employee.bankDetails || previous.bankDetails })); }, [existing]);
  const updateField = (path, value) => setForm((current) => { const [group, field] = path.split("."); return field ? { ...current, [group]: { ...current[group], [field]: value } } : { ...current, [group]: value }; });
  const submit = async () => { if (!form.firstName || !form.lastName || !form.dateOfJoining) { toast.error("First name, last name and date of joining are required"); setTab("basic"); return; } const payload = { ...form, basicSalary: +form.basicSalary || 0, commissionRate: +form.commissionRate || 0, departmentId: form.departmentId || undefined, designationId: form.designationId || undefined, reportsToId: form.reportsToId || undefined, workShift: form.workShift || undefined, salaryStructureId: form.salaryStructureId || undefined }; const result = isEdit ? await update.mutateAsync({ id, data: payload }) : await create.mutateAsync(payload); router.push(`/employees/${isEdit ? id : result.data._id}`); };
  const departmentOptions = (departments?.data || []).map((item) => ({ value: item._id, label: item.name })); const designationOptions = (designations?.data || []).map((item) => ({ value: item._id, label: item.name })); const shiftOptions = (shifts?.data || []).map((item) => ({ value: item._id, label: item.name }));
  return <div><PageHeader title={isEdit ? "Edit Employee" : "New Employee"} actions={<Button variant="outline" onClick={() => router.push("/employees")}><ArrowLeft size={16} className="mr-1.5" />Back</Button>} /><Card><div className="flex gap-1 border-b px-4">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}>{label}</button>)}</div><div className="space-y-4 p-6">{tab === "basic" && <><div className="grid grid-cols-2 gap-4"><Input label="First Name" required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} /><Input label="Last Name" required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} /></div><div className="grid grid-cols-3 gap-4"><Select label="Gender" placeholder="Select..." options={options([["male", "Male"], ["female", "Female"], ["other", "Other"], ["prefer_not_to_say", "Prefer not to say"]])} value={form.gender} onChange={(event) => updateField("gender", event.target.value)} /><Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} /><Input label="NIC Number" value={form.nationalIdNumber} onChange={(event) => updateField("nationalIdNumber", event.target.value)} /></div><div className="grid grid-cols-3 gap-4"><Select label="Marital Status" placeholder="Select..." options={options([["single", "Single"], ["married", "Married"], ["divorced", "Divorced"], ["widowed", "Widowed"], ["separated", "Separated"]])} value={form.maritalStatus} onChange={(event) => updateField("maritalStatus", event.target.value)} /><Input label="Nationality" value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} /><Input label="Blood Group" value={form.bloodGroup} onChange={(event) => updateField("bloodGroup", event.target.value)} /></div></>}{tab === "contact" && <><div className="grid grid-cols-3 gap-4"><Input label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /><Input label="Phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /><Input label="Mobile" value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} /></div><p className="text-sm font-semibold">Permanent Address</p><Input label="Line 1" value={form.permanentAddress.line1} onChange={(event) => updateField("permanentAddress.line1", event.target.value)} /><div className="grid grid-cols-2 gap-4"><Input label="City" value={form.permanentAddress.city} onChange={(event) => updateField("permanentAddress.city", event.target.value)} /><Input label="Postal Code" value={form.permanentAddress.postalCode} onChange={(event) => updateField("permanentAddress.postalCode", event.target.value)} /></div><p className="text-sm font-semibold">Emergency Contact</p><div className="grid grid-cols-3 gap-4"><Input label="Name" value={form.emergencyContact.name} onChange={(event) => updateField("emergencyContact.name", event.target.value)} /><Input label="Relationship" value={form.emergencyContact.relationship} onChange={(event) => updateField("emergencyContact.relationship", event.target.value)} /><Input label="Phone" value={form.emergencyContact.phone} onChange={(event) => updateField("emergencyContact.phone", event.target.value)} /></div></>}{tab === "employment" && <><div className="grid grid-cols-2 gap-4"><Select label="Department" placeholder="Select..." options={departmentOptions} value={form.departmentId} onChange={(event) => updateField("departmentId", event.target.value)} /><Select label="Designation" placeholder="Select..." options={designationOptions} value={form.designationId} onChange={(event) => updateField("designationId", event.target.value)} /></div><div className="grid grid-cols-2 gap-4"><Select label="Employment Type" options={options([["permanent", "Permanent"], ["contract", "Contract"], ["probation", "Probation"], ["intern", "Intern"], ["part_time", "Part-time"], ["consultant", "Consultant"]])} value={form.employmentType} onChange={(event) => updateField("employmentType", event.target.value)} /><Input label="Date of Joining" required type="date" value={form.dateOfJoining} onChange={(event) => updateField("dateOfJoining", event.target.value)} /></div><div className="grid grid-cols-3 gap-4"><Input label="Probation End Date" type="date" value={form.probationEndDate} onChange={(event) => updateField("probationEndDate", event.target.value)} /><Input label="Work Location" value={form.workLocation} onChange={(event) => updateField("workLocation", event.target.value)} /><Select label="Work Shift" placeholder="Select..." options={shiftOptions} value={form.workShift} onChange={(event) => updateField("workShift", event.target.value)} /></div><Select label="Status" options={options([["active", "Active"], ["probation", "Probation"], ["on_leave", "On Leave"], ["suspended", "Suspended"], ["terminated", "Terminated"], ["resigned", "Resigned"], ["retired", "Retired"]])} value={form.status} onChange={(event) => updateField("status", event.target.value)} /></>}{tab === "statutory" && <><div className="grid grid-cols-3 gap-4"><Input label="EPF Number" value={form.epfNumber} onChange={(event) => updateField("epfNumber", event.target.value)} /><Input label="ETF Number" value={form.etfNumber} onChange={(event) => updateField("etfNumber", event.target.value)} /><Input label="Tax Registration (TIN)" value={form.taxRegistrationNumber} onChange={(event) => updateField("taxRegistrationNumber", event.target.value)} /></div><p className="text-sm font-semibold">Bank Details (for salary disbursement)</p><div className="grid grid-cols-2 gap-4"><Input label="Bank Name" value={form.bankDetails.bankName} onChange={(event) => updateField("bankDetails.bankName", event.target.value)} /><Input label="Branch Name" value={form.bankDetails.branchName} onChange={(event) => updateField("bankDetails.branchName", event.target.value)} /><Input label="Account Number" value={form.bankDetails.accountNumber} onChange={(event) => updateField("bankDetails.accountNumber", event.target.value)} /><Input label="Account Name" value={form.bankDetails.accountName} onChange={(event) => updateField("bankDetails.accountName", event.target.value)} /></div></>}{tab === "compensation" && <><div className="grid grid-cols-2 gap-4"><Input label="Basic Salary (LKR/month)" type="number" min="0" step="0.01" value={form.basicSalary} onChange={(event) => updateField("basicSalary", event.target.value)} /><Input label="Sales Commission (%)" type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={(event) => updateField("commissionRate", event.target.value)} /></div><div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Payroll tip:</strong> Allowances from the salary structure will be added on top of basic when payroll runs. EPF (8% employee + 12% employer) and ETF (3%) auto-calculate. APIT income tax applies if gross exceeds LKR 150,000/month.</div><Textarea label="Notes" rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></>}</div><div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4"><Button variant="outline" onClick={() => router.push("/employees")}>Cancel</Button><Button variant="primary" onClick={submit} loading={create.isPending || update.isPending}><Save size={16} className="mr-1.5" />{isEdit ? "Update" : "Create Employee"}</Button></div></Card></div>;
}
