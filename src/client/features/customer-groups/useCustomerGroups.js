"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customerGroupsApi } from "./customerGroupsApi.js";

export const useCustomerGroups = (params = {}) =>
  useQuery({
    queryKey: ["customerGroups", params],
    queryFn: () => customerGroupsApi.list(params),
    staleTime: 5 * 60 * 1000,
  });

function useGroupMutation(fn, success, failure) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerGroups"] });
      toast.success(success);
    },
    onError: (error) => toast.error(error.response?.data?.message || failure),
  });
}

export const useCreateCustomerGroup = () =>
  useGroupMutation(customerGroupsApi.create, "Group created", "Failed to create");

export const useUpdateCustomerGroup = () =>
  useGroupMutation(
    ({ id, data }) => customerGroupsApi.update(id, data),
    "Group updated",
    "Failed to update",
  );

export const useDeleteCustomerGroup = () =>
  useGroupMutation(customerGroupsApi.delete, "Group deleted", "Failed to delete");
