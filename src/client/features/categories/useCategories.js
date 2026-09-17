"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { categoriesApi } from "./categoriesApi.js";

export const useCategories = (params = {}) =>
  useQuery({
    queryKey: ["categories", params],
    queryFn: () => categoriesApi.list(params),
  });

function useCategoryMutation(fn, success, failure) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(success);
    },
    onError: (error) => toast.error(error.response?.data?.message || failure),
  });
}

export const useCreateCategory = () =>
  useCategoryMutation(categoriesApi.create, "Category created", "Failed to create");

export const useUpdateCategory = () =>
  useCategoryMutation(
    ({ id, data }) => categoriesApi.update(id, data),
    "Category updated",
    "Failed to update",
  );

export const useDeleteCategory = () =>
  useCategoryMutation(categoriesApi.delete, "Category deleted", "Failed to delete");
