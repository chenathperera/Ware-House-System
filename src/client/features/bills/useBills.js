"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { billsApi } from "./billsApi.js";

export const useBills = (filters = {}) => useQuery({
  queryKey: ["bills", filters],
  queryFn: () => billsApi.list(filters),
  placeholderData: (previous) => previous,
});

export const useBill = (id) => useQuery({
  queryKey: ["bill", id],
  queryFn: () => billsApi.getById(id),
  enabled: !!id,
});

export function useCreateBillFromGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billsApi.createFromGrn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill created from GRN");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
}

export const usePayablesAging = () => useQuery({
  queryKey: ["payablesAging"],
  queryFn: billsApi.agingSummary,
});
