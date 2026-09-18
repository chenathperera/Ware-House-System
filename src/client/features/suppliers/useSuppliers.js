"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { suppliersApi } from "./suppliersApi.js";
export const useSuppliers = (filters = {}) =>
  useQuery({
    queryKey: ["suppliers", filters],
    queryFn: () => suppliersApi.list(filters),
    placeholderData: (previous) => previous,
  });
export const useSupplier = (id) =>
  useQuery({
    queryKey: ["supplier", id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!id,
  });
const useSupplierMutation = (fn, success) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(success);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
};
export const useCreateSupplier = () =>
  useSupplierMutation(suppliersApi.create, "Supplier created");
export const useUpdateSupplier = () =>
  useSupplierMutation(
    ({ id, data }) => suppliersApi.update(id, data),
    "Supplier updated",
  );
export const useDeleteSupplier = () =>
  useSupplierMutation(suppliersApi.delete, "Supplier deleted");
