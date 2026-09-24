"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fundTransfersApi } from "./fundTransfersApi.js";

export function useFundTransfers() {
  return useQuery({
    queryKey: ["fund-transfers"],
    queryFn: fundTransfersApi.list,
  });
}

function useFundTransferMutation(mutationFn, message, invalidateBankAccounts = false) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-transfers"] });

      if (invalidateBankAccounts) {
        queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      }

      toast.success(message);
    },
  });
}

export function useCreateFundTransfer() {
  return useFundTransferMutation(
    fundTransfersApi.create,
    "Transfer completed",
    true,
  );
}

export function useDeleteFundTransfer() {
  return useFundTransferMutation(
    fundTransfersApi.remove,
    "Transfer reversed",
    true,
  );
}

export function useUpdateFundTransfer() {
  return useFundTransferMutation(fundTransfersApi.update, "Transfer updated");
}
