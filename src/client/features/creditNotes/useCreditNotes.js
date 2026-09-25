"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { creditNotesApi } from "./creditNotesApi.js";
export const useCreditNotes = (filters = {}) => useQuery({ queryKey: ["creditNotes", filters], queryFn: () => creditNotesApi.list(filters), placeholderData: (previous) => previous });
export const useCreditNote = (id) => useQuery({ queryKey: ["creditNote", id], queryFn: () => creditNotesApi.getById(id), enabled: !!id });
export const useApplyCreditNote = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => creditNotesApi.apply(id, data), onSuccess: () => { ["creditNotes", "creditNote", "invoices", "invoice", "customers"].forEach((key) => client.invalidateQueries({ queryKey: [key] })); toast.success("Credit applied to invoice"); }, onError: (error) => toast.error(error.response?.data?.message || "Failed") }); };
