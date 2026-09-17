"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customersApi } from "./customersApi.js";

export const useCustomers = (filters = {}) =>
  useQuery({
    queryKey: ["customers", filters],
    queryFn: () => customersApi.list(filters),
  });

function useCustomerMutation(mutationFn, successMessage, failureMessage) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(successMessage);
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || failureMessage),
  });
}

export const useCreateCustomer = () =>
  useCustomerMutation(
    customersApi.create,
    "Customer created",
    "Failed to create",
  );
export const useUpdateCustomer = () =>
  useCustomerMutation(
    ({ id, data }) => customersApi.update(id, data),
    "Customer updated",
    "Failed to update",
  );
export const useDeleteCustomer = () =>
  useCustomerMutation(
    customersApi.delete,
    "Customer deleted",
    "Failed to delete",
  );
export const useToggleCreditHold = () =>
  useCustomerMutation(
    ({ id, reason }) => customersApi.toggleCreditHold(id, reason),
    "Credit hold updated",
    "Failed to update credit hold",
  );
