"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import Button from "../../../components/ui/Button.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import {
  useAttendance,
  useBulkMarkAttendance,
  useDepartments,
  useEmployees,
} from "../../../client/features/hr/useHr.js";

const statuses = ["present", "absent", "half_day", "late", "leave"];
const statusLabels = {
  present: "Present",
  absent: "Absent",
  half_day: "Half Day",
  late: "Late",
  leave: "Leave",
};
const statusVariant = {
  present: "success",
  absent: "danger",
  half_day: "warning",
  leave: "info",
  holiday: "default",
  weekend: "default",
  late: "warning",
};

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderEmployee(record) {
  return (
    <div>
      <p className="text-sm font-medium">{record.employeeName}</p>
      <p className="font-mono text-xs text-gray-500">{record.employeeCode}</p>
    </div>
  );
}

function renderStatus(record) {
  return (
    <Badge variant={statusVariant[record.status]}>
      {record.status?.replace(/_/g, " ")}
    </Badge>
  );
}

function renderWorkedTime(record) {
  if (!record.totalWorkedMinutes) return "—";
  return `${(record.totalWorkedMinutes / 60).toFixed(1)} hrs`;
}

function renderLateMinutes(record) {
  return record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—";
}

function renderOvertime(record) {
  return record.overtimeMinutes > 0
    ? `${(record.overtimeMinutes / 60).toFixed(1)} hrs`
    : "—";
}

function AttendanceTable({ records }) {
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: renderEmployee,
    },
    {
      key: "status",
      label: "Status",
      render: renderStatus,
    },
    {
      key: "checkInTime",
      label: "Check In",
      render: (record) => formatTime(record.checkInTime),
    },
    {
      key: "checkOutTime",
      label: "Check Out",
      render: (record) => formatTime(record.checkOutTime),
    },
    {
      key: "totalWorkedMinutes",
      label: "Worked",
      render: renderWorkedTime,
    },
    {
      key: "lateMinutes",
      label: "Late",
      render: renderLateMinutes,
    },
    {
      key: "overtimeMinutes",
      label: "OT",
      render: renderOvertime,
    },
  ];

  return <Table columns={columns} data={records} />;
}

function BulkAttendanceRows({ records, onChange }) {
  return records.map((record, index) => {
    const canEnterTimes = ["present", "late", "half_day"].includes(record.status);

    return (
      <tr key={record.employeeId}>
        <td className="py-2">{record.employeeName}</td>
        <td className="py-2">
          <select
            value={record.status}
            onChange={(event) => onChange(index, "status", event.target.value)}
            className="rounded border px-2 py-1 text-xs"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.checkInTime}
            disabled={!canEnterTimes}
            onChange={(event) => onChange(index, "checkInTime", event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.checkOutTime}
            disabled={!canEnterTimes}
            onChange={(event) => onChange(index, "checkOutTime", event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
      </tr>
    );
  });
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [departmentId, setDepartmentId] = useState("");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRecords, setBulkRecords] = useState([]);
  const attendanceQuery = useAttendance({
    date: selectedDate,
    departmentId: departmentId || undefined,
    limit: 200,
  });
  const employeesQuery = useEmployees({
    departmentId: departmentId || undefined,
    status: "active",
    limit: 500,
  });
  const departmentsQuery = useDepartments();
  const bulkMark = useBulkMarkAttendance();
  const attendance = attendanceQuery.data?.data || [];
  const employees = employeesQuery.data?.data || [];
  const departments = departmentsQuery.data?.data || [];
  const departmentOptions = departments.map((department) => ({
    value: department._id,
    label: department.name,
  }));

  const openBulkMark = () => {
    const attendanceByEmployee = new Map(
      attendance.map((record) => [record.employeeId._id || record.employeeId, record]),
    );
    const records = employees.map((employee) => {
      const existing = attendanceByEmployee.get(employee._id);
      return {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: existing?.status || "present",
        checkInTime: existing?.checkInTime || `${selectedDate}T08:00`,
        checkOutTime: existing?.checkOutTime || `${selectedDate}T17:00`,
      };
    });

    setBulkRecords(records);
    setIsBulkOpen(true);
  };

  const updateBulkRecord = (index, field, value) => {
    setBulkRecords((records) => records.map((record, recordIndex) => {
      if (recordIndex !== index) return record;
      return { ...record, [field]: value };
    }));
  };

  const submitBulkMark = async () => {
    await bulkMark.mutateAsync({
      date: selectedDate,
      records: bulkRecords.map((record) => ({
        employeeId: record.employeeId,
        status: record.status,
        checkInTime: ["present", "late"].includes(record.status)
          ? record.checkInTime
          : undefined,
        checkOutTime: ["present", "late"].includes(record.status)
          ? record.checkOutTime
          : undefined,
      })),
    });
    setIsBulkOpen(false);
  };

  const bulkAction = (
    <Button variant="primary" onClick={openBulkMark}>
      <Plus size={16} className="mr-1.5" />
      Bulk Mark Attendance
    </Button>
  );

  const emptyAction = (
    <Button variant="primary" onClick={openBulkMark}>
      Mark Attendance
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily staff attendance records"
        actions={bulkAction}
      />

      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="w-48">
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          <div className="w-56">
            <Select
              placeholder="All Departments"
              options={departmentOptions}
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            />
          </div>
        </div>

        {attendance.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No attendance recorded"
            description="Click 'Bulk Mark Attendance' to record for today"
            action={emptyAction}
          />
        ) : (
          <AttendanceTable records={attendance} />
        )}
      </Card>

      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title={`Mark Attendance — ${selectedDate}`}
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 text-left">Employee</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">In</th>
                <th className="py-2 text-left">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <BulkAttendanceRows
                records={bulkRecords}
                onChange={updateBulkRecord}
              />
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submitBulkMark}
            loading={bulkMark.isPending}
          >
            Save All ({bulkRecords.length} records)
          </Button>
        </div>
      </Modal>
    </div>
  );
}
