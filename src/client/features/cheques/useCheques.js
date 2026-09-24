"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { chequesApi } from "./chequesApi.js";

export function useCheques(filters = {}) {
  return useQuery({
    queryKey: ["cheques", filters],
    queryFn: () => chequesApi.list(filters),
  });
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chequesApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque status updated");
    },
  });
}

export function useDeleteCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chequesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque record deleted");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Delete failed");
    },
  });
}
