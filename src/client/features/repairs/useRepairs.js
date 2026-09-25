"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { repairsApi } from "./repairsApi.js";
export const useRepairs = (filters = {}) => useQuery({ queryKey: ["repairs", filters], queryFn: () => repairsApi.list(filters), placeholderData: (previous) => previous });
export const useRepair = (id) => useQuery({ queryKey: ["repair", id], queryFn: () => repairsApi.getById(id), enabled: !!id });
const mutation = (fn, message, stock = false) => { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: () => { ["repairs", "repair", ...(stock ? ["stock"] : [])].forEach((key) => client.invalidateQueries({ queryKey: [key] })); toast.success(message); }, onError: (error) => toast.error(error.response?.data?.message || "Failed") }); };
export const useStartRepair = () => mutation(({ id, data }) => repairsApi.start(id, data), "Repair started");
export const useCompleteRepair = () => mutation(({ id, data }) => repairsApi.complete(id, data), "Repair completed", true);
