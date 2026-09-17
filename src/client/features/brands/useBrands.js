"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { brandsApi } from "./brandsApi.js";

export const useBrands = (params = {}) =>
  useQuery({
    queryKey: ["brands", params],
    queryFn: () => brandsApi.list(params),
  });

function useBrandMutation(fn, success, failure) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success(success);
    },
    onError: (error) => toast.error(error.response?.data?.message || failure),
  });
}

export const useCreateBrand = () =>
  useBrandMutation(brandsApi.create, "Brand created", "Failed to create");

export const useUpdateBrand = () =>
  useBrandMutation(
    ({ id, data }) => brandsApi.update(id, data),
    "Brand updated",
    "Failed to update",
  );

export const useDeleteBrand = () =>
  useBrandMutation(brandsApi.delete, "Brand deleted", "Failed to delete");
