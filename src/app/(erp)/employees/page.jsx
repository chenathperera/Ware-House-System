"use client";
import { useState } from "react";
import { Eye, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useDepartments, useEmployees } from "../../../client/features/hr/useHr.js";

const variants = { active: "success", on_leave: "warning", probation: "info", suspended: "danger", terminated: "default", resigned: "default" };
export default function EmployeesPage() {
  const router = useRouter(); const [filters, setFilters] = useState({ search: "", departmentId: "", status: "", page: 1, limit: 15 }); const { data, isLoading } = useEmployees(filters); const { data: departmentsData } = useDepartments(); const employees = data?.data || [];
  const change = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  const columns = [{ key: "employeeCode", label: "Code", render: (row) => <span className="font-mono text-xs">{row.employeeCode}</span> }, { key: "employee", label: "Employee", render: (row) => <div><p className="font-medium">{row.firstName} {row.lastName}</p><p className="text-xs text-gray-500">{row.email || row.phone || "—"}</p></div> }, { key: "department", label: "Department", render: (row) => row.departmentId?.name || "—" }, { key: "designation", label: "Designation", render: (row) => row.designationId?.name || "—" }, { key: "type", label: "Type", render: (row) => row.employmentType?.replace(/_/g, " ") }, { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status?.replace(/_/g, " ")}</Badge> }, { key: "actions", label: "", render: (row) => <button onClick={() => router.push(`/employees/${row._id}`)} className="rounded p-1.5 hover:bg-gray-100"><Eye size={16} /></button> }];
  return <div><PageHeader title="Employees" description="Manage employee records" actions={<Button variant="primary" onClick={() => router.push("/employees/new")}><Plus size={16} className="mr-1.5" />Add Employee</Button>} /><Card><div className="flex flex-wrap gap-3 border-b p-4"><div className="min-w-60 flex-1"><Input placeholder="Search employees..." value={filters.search} onChange={(event) => change("search", event.target.value)} icon={<Search size={16} />} /></div><div className="w-48"><Select placeholder="All Departments" value={filters.departmentId} options={(departmentsData?.data || []).map((row) => ({ value: row._id, label: row.name }))} onChange={(event) => change("departmentId", event.target.value)} /></div><div className="w-40"><Select placeholder="All Statuses" value={filters.status} options={["active", "on_leave", "probation", "suspended", "terminated", "resigned", "retired"].map((value) => ({ value, label: value.replace(/_/g, " ") }))} onChange={(event) => change("status", event.target.value)} /></div></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : employees.length ? <><Table columns={columns} data={employees} onRowClick={(row) => router.push(`/employees/${row._id}`)} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters({ ...filters, page })} /></> : <EmptyState icon={Users} title="No employees" description="Add your first employee" action={<Button variant="primary" onClick={() => router.push("/employees/new")}>Add Employee</Button>} />}</Card></div>;
}
