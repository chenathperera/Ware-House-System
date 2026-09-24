"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { paymentsApi } from "./paymentsApi.js";

export function usePayments(filters = {}) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => paymentsApi.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function usePayment(id) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
  });
}

function invalidateQueries(queryClient, keys) {
  keys.forEach((key) => {
    queryClient.invalidateQueries({
      queryKey: [key],
    });
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.create,

    onSuccess: () => {
      invalidateQueries(queryClient, [
        "payments",
        "invoices",
        "invoice",
        "invoicesAging",
        "bills",
        "customers",
        "dashboard",
        "cheques",
      ]);

      toast.success("Payment recorded");
    },

    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed");
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.remove,

    onSuccess: () => {
      invalidateQueries(queryClient, [
        "payments",
        "invoices",
        "invoice",
        "invoicesAging",
        "bills",
        "bank-accounts",
        "cheques",
      ]);

      toast.success("Payment deleted");
    },

    onError: (error) => {
      toast.error(error.response?.data?.message || "Delete failed");
    },
  });
}
