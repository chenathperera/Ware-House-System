"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { attendanceApi, departmentsApi, designationsApi, employeesApi, holidaysApi, leavesApi, salaryStructuresApi, shiftsApi } from "./hrApi.js";

const failed = (error) =>
  toast.error(error.response?.data?.message || "Failed");
const makeHooks = (key, resource, success, previous = false) => ({
  useList: (filters = {}) =>
    useQuery({
      queryKey: [key, filters],
      queryFn: () => resource.list(filters),
      ...(previous ? { placeholderData: (data) => data } : {}),
    }),
  useOne: (id) =>
    useQuery({
      queryKey: [key.slice(0, -1), id],
      queryFn: () => resource.getById(id),
      enabled: !!id,
    }),
  useCreate: () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: resource.create,
      onSuccess: () => {
        client.invalidateQueries({ queryKey: [key] });
        toast.success(success.create);
      },
      onError: failed,
    });
  },
  useUpdate: () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }) => resource.update(id, data),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: [key] });
        client.invalidateQueries({ queryKey: [key.slice(0, -1)] });
        toast.success(success.update);
      },
      onError: failed,
    });
  },
  useDelete: () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: resource.delete,
      onSuccess: () => {
        client.invalidateQueries({ queryKey: [key] });
        toast.success(success.delete);
      },
      onError: failed,
    });
  },
});
const departments = makeHooks("departments", departmentsApi, {
  create: "Department created",
  update: "Updated",
  delete: "Deleted",
});
const designations = makeHooks("designations", designationsApi, {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
});
const employees = makeHooks(
  "employees",
  employeesApi,
  { create: "Employee added", update: "Updated", delete: "Terminated" },
  true,
);
const shifts = makeHooks("shifts", shiftsApi, {
  create: "Shift created",
  update: "Updated",
  delete: "Deleted",
});
export const useDepartments = departments.useList; export const useCreateDepartment = departments.useCreate; export const useUpdateDepartment = departments.useUpdate; export const useDeleteDepartment = departments.useDelete;
export const useDesignations = designations.useList; export const useCreateDesignation = designations.useCreate; export const useUpdateDesignation = designations.useUpdate; export const useDeleteDesignation = designations.useDelete;
export const useEmployees = employees.useList; export const useEmployee = employees.useOne; export const useCreateEmployee = employees.useCreate; export const useUpdateEmployee = employees.useUpdate; export const useDeleteEmployee = employees.useDelete;
export const useShifts = shifts.useList; export const useCreateShift = shifts.useCreate; export const useUpdateShift = shifts.useUpdate; export const useDeleteShift = shifts.useDelete;
export const useAttendance = (filters = {}) => useQuery({ queryKey: ["attendance", filters], queryFn: () => attendanceApi.list(filters), placeholderData: (data) => data });
export const useMarkAttendance = () => { const client = useQueryClient(); return useMutation({ mutationFn: attendanceApi.mark, onSuccess: () => { client.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Marked"); }, onError: failed }); };
export const useBulkMarkAttendance = () => { const client = useQueryClient(); return useMutation({ mutationFn: attendanceApi.bulkMark, onSuccess: (result) => { client.invalidateQueries({ queryKey: ["attendance"] }); toast.success(`Marked ${result.count} records`); }, onError: failed }); };
export const useLeaves = (filters = {}) => useQuery({ queryKey: ["leaves", filters], queryFn: () => leavesApi.list(filters), placeholderData: (data) => data });
export const useCreateLeave = () => { const client = useQueryClient(); return useMutation({ mutationFn: leavesApi.create, onSuccess: (result) => { client.invalidateQueries({ queryKey: ["leaves"] }); toast.success("Leave request submitted"); if (result.warning) toast(result.warning, { icon: "⚠️" }); }, onError: failed }); };
export const useLeaveActions = () => { const client = useQueryClient(); const invalidate = (keys) => () => keys.forEach((key) => client.invalidateQueries({ queryKey: [key] })); return { approve: useMutation({ mutationFn: leavesApi.approve, onSuccess: invalidate(["leaves", "employees"]), onError: failed }), reject: useMutation({ mutationFn: leavesApi.reject, onSuccess: invalidate(["leaves"]), onError: failed }), cancel: useMutation({ mutationFn: leavesApi.cancel, onSuccess: invalidate(["leaves", "employees"]), onError: failed }) }; };
const holidays = makeHooks("holidays", holidaysApi, { create: "Added", update: "Updated", delete: "Deleted" });
export const useHolidays = holidays.useList; export const useCreateHoliday = holidays.useCreate; export const useUpdateHoliday = holidays.useUpdate; export const useDeleteHoliday = holidays.useDelete;
const salaryStructures = makeHooks("salaryStructures", salaryStructuresApi, { create: "Created", update: "Updated", delete: "Deleted" });
export const useSalaryStructures = salaryStructures.useList; export const useCreateSalaryStructure = salaryStructures.useCreate; export const useUpdateSalaryStructure = salaryStructures.useUpdate; export const useDeleteSalaryStructure = salaryStructures.useDelete;
