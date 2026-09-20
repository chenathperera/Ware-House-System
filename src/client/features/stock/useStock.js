"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { stockApi } from "./stockApi.js";

export const useStockItems = (filters = {}) =>
  useQuery({
    queryKey: ["stock", filters],
    queryFn: () => stockApi.list(filters),
    placeholderData: (previous) => previous,
  });

export const useStockMovements = (filters = {}) =>
  useQuery({
    queryKey: ["stockMovements", filters],
    queryFn: () => stockApi.movements(filters),
    placeholderData: (previous) => previous,
  });

export const useReservations = (filters = {}) =>
  useQuery({
    queryKey: ["stockReservations", filters],
    queryFn: () => stockApi.reservations(filters),
  });

function useStockMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
}

export const useOpeningStock = () => useStockMutation(stockApi.openingStock);
export const useTransferStock = () => useStockMutation(stockApi.transfer);
export const useAdjustStock = () => useStockMutation(stockApi.adjust);
