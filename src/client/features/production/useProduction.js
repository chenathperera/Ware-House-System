"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productionApi } from "./productionApi.js";
export const useProductionOrders = (filters = {}) => useQuery({ queryKey: ["productionOrders", filters], queryFn: () => productionApi.list(filters), placeholderData: (previous) => previous });
export const useProductionOrder = (id) => useQuery({ queryKey: ["productionOrder", id], queryFn: () => productionApi.getById(id), enabled: !!id });
const mutation = (fn, message, stock = false) => { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: () => { ["productionOrders", "productionOrder", ...(stock ? ["stock"] : [])].forEach((key) => client.invalidateQueries({ queryKey: [key] })); toast.success(message); }, onError: (error) => toast.error(error.response?.data?.message || "Failed") }); };
export const useCreateProductionOrder = () => mutation(productionApi.create, "Production order created");
export const useProductionAction = () => ({ approve: mutation(productionApi.approve, "Production order approved"), start: mutation(productionApi.start, "Production started"), complete: mutation(({ id, data }) => productionApi.complete(id, data), "Production completed", true), hold: mutation(({ id, reason }) => productionApi.hold(id, reason), "Production put on hold"), cancel: mutation(({ id, reason }) => productionApi.cancel(id, reason), "Production cancelled"), delete: mutation(productionApi.delete, "Draft production order deleted") });
