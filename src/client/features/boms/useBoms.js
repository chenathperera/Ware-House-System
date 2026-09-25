"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bomsApi } from "./bomsApi.js";
export const useBoms = (filters = {}) => useQuery({ queryKey: ["boms", filters], queryFn: () => bomsApi.list(filters), placeholderData: (previous) => previous });
export const useBom = (id) => useQuery({ queryKey: ["bom", id], queryFn: () => bomsApi.getById(id), enabled: !!id });
export const useCheckAvailability = (id, quantity) => useQuery({ queryKey: ["bomAvailability", id, quantity], queryFn: () => bomsApi.checkAvailability(id, quantity), enabled: !!id && !!quantity });
const mutation = (fn, message) => { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: () => { client.invalidateQueries({ queryKey: ["boms"] }); toast.success(message); }, onError: (error) => toast.error(error.response?.data?.message || "Failed") }); };
export const useCreateBom = () => mutation(bomsApi.create, "BOM created"); export const useUpdateBom = () => mutation(({ id, data }) => bomsApi.update(id, data), "BOM updated"); export const useDeleteBom = () => mutation(bomsApi.delete, "BOM archived");
