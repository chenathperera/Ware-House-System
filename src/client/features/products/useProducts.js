"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi } from "./productsApi.js";
export const useProducts = (filters = {}) =>
  useQuery({
    queryKey: ["products", filters],
    queryFn: () => productsApi.list(filters),
  });
const useProductMutation = (fn, success) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["products"] });
      toast.success(success);
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Request failed"),
  });
};
export const useCreateProduct = () =>
  useProductMutation(productsApi.create, "Product created");
export const useUpdateProduct = () =>
  useProductMutation(
    ({ id, data }) => productsApi.update(id, data),
    "Product updated",
  );
export const useDeleteProduct = () =>
  useProductMutation(productsApi.delete, "Product deleted");
