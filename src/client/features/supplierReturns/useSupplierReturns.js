"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supplierReturnsApi } from "./supplierReturnsApi.js";
const failure = (error) => toast.error(error.response?.data?.message || "Failed");
const success = (queryClient, keys, message) => () => { keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] })); toast.success(message); };
export const useSupplierReturns = (filters = {}) => useQuery({ queryKey: ["supplierReturns", filters], queryFn: () => supplierReturnsApi.list(filters) });
export const useSupplierReturn = (id) => useQuery({ queryKey: ["supplierReturn", id], queryFn: () => supplierReturnsApi.getById(id), enabled: !!id });
export function useCreateSupplierReturn() { const queryClient = useQueryClient(); return useMutation({ mutationFn: supplierReturnsApi.create, onSuccess: success(queryClient, ["supplierReturns"], "Return created"), onError: failure }); }
export function useSendSupplierReturn() { const queryClient = useQueryClient(); return useMutation({ mutationFn: supplierReturnsApi.send, onSuccess: success(queryClient, ["supplierReturns", "supplierReturn", "stock"], "Sent"), onError: failure }); }
export function useRecordSupplierCredit() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => supplierReturnsApi.recordCredit(id, data), onSuccess: success(queryClient, ["supplierReturns", "supplierReturn"], "Credit recorded"), onError: failure }); }
