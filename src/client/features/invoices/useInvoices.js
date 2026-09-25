"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invoicesApi } from "./invoicesApi.js";

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoicesApi.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  });
}

function useInvoiceMutation(mutationFn, message) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      ["invoices", "invoice", "customers", "dashboard"].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success(message);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
}

export const useCreateInvoice = () =>
  useInvoiceMutation(invoicesApi.create, "Invoice created");

export const useGenerateFromSO = () =>
  useInvoiceMutation(invoicesApi.createFromSalesOrder, "Invoice generated from sales order");

export const useChangeInvoiceStatus = () =>
  useInvoiceMutation(
    ({ id, status, reason }) => invoicesApi.changeStatus(id, status, reason),
    "Status updated",
  );
