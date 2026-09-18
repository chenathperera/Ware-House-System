"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi } from "./productsApi.js";

export const useProducts = (filters = {}) =>
  useQuery({
    queryKey: ["products", filters],
    queryFn: () => productsApi.list(filters),
    placeholderData: (previous) => previous,
  });
export const useProduct = (id) =>
  useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
function useProductMutation(mutationFn, successMessage, failureMessage) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(successMessage);
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || failureMessage),
  });
}
export const useCreateProduct = () =>
  useProductMutation(
    productsApi.create,
    "Product created",
    "Failed to create product",
  );
export const useUpdateProduct = () =>
  useProductMutation(
    ({ id, data }) => productsApi.update(id, data),
    "Product updated",
    "Failed to update product",
  );
export const useDeleteProduct = () =>
  useProductMutation(
    productsApi.delete,
    "Product deleted",
    "Failed to delete product",
  );
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: () => productsApi.listCategories({ isActive: true }),
    staleTime: 5 * 60 * 1000,
  });
export const useBrands = () =>
  useQuery({
    queryKey: ["brands"],
    queryFn: () => productsApi.listBrands(),
    staleTime: 5 * 60 * 1000,
  });
export const useUoms = () =>
  useQuery({
    queryKey: ["uoms"],
    queryFn: () => productsApi.listUoms(),
    staleTime: 10 * 60 * 1000,
  });
