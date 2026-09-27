"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { departmentsApi, designationsApi, employeesApi, shiftsApi } from "./hrApi.js";

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
