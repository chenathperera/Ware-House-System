"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { paymentsApi } from "./paymentsApi.js";

export function usePayments(filters = {}) {
  return useQuery({ queryKey: ["payments", filters], queryFn: () => paymentsApi.list(filters), placeholderData: (previous) => previous });
}
export function usePayment(id) {
  return useQuery({ queryKey: ["payment", id], queryFn: () => paymentsApi.getById(id), enabled: !!id });
}
function usePaymentMutation(mutationFn, message) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      ["payments", "bills", "bank-accounts", "cheques", "customers", "dashboard"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(message);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
}
export const useCreatePayment = () => usePaymentMutation(paymentsApi.create, "Payment recorded");
export const useDeletePayment = () => usePaymentMutation(paymentsApi.remove, "Payment deleted");
