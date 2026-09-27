"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productionApi } from "./productionApi.js";

export const useProductionOrders = (filters = {}) =>
  useQuery({
    queryKey: ["productionOrders", filters],
    queryFn: () => productionApi.list(filters),
    placeholderData: (previous) => previous,
  });

export const useProductionOrder = (id) =>
  useQuery({
    queryKey: ["productionOrder", id],
    queryFn: () => productionApi.getById(id),
    enabled: !!id,
  });

const useProductionMutation = (fn, message, updatesStock = false) => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      ["productionOrders", "productionOrder"].forEach((key) => {
        client.invalidateQueries({ queryKey: [key] });
      });

      if (updatesStock) {
        client.invalidateQueries({ queryKey: ["stock"] });
        client.invalidateQueries({ queryKey: ["stockMovements"] });
      }

      toast.success(result?.message || message);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed"),
  });
};

export const useCreateProductionOrder = () =>
  useProductionMutation(productionApi.create, "Production order created");

export const useProductionAction = () => ({
  approve: useProductionMutation(productionApi.approve, "Production order approved"),
  start: useProductionMutation(productionApi.start, "Production started"),
  complete: useProductionMutation(
    ({ id, data }) => productionApi.complete(id, data),
    "Production completed",
    true,
  ),
  hold: useProductionMutation(productionApi.hold, "Production put on hold"),
  cancel: useProductionMutation(productionApi.cancel, "Production cancelled"),
  delete: useProductionMutation(productionApi.delete, "Draft production order deleted"),
});
