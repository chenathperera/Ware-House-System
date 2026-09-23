"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bankAccountsApi } from "./bankAccountsApi.js";

const showError = (error) => {
  toast.error(error.response?.data?.message || "Failed");
};

export function useBankAccounts(filters = {}) {
  return useQuery({
    queryKey: ["bank-accounts", filters],
    queryFn: () => bankAccountsApi.list(filters),
  });
}

function useBankAccountMutation(mutationFn, message) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success(message);
    },
    onError: showError,
  });
}

export function useCreateBankAccount() {
  return useBankAccountMutation(bankAccountsApi.create, "Bank account added");
}

export function useUpdateBankAccount() {
  return useBankAccountMutation(bankAccountsApi.update, "Bank account updated");
}

export function useDeleteBankAccount() {
  return useBankAccountMutation(bankAccountsApi.remove, "Bank account deleted");
}
