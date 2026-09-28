"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { posSessionsApi } from "./posSessionsApi.js";

export const useActivePosSession = () => useQuery({ queryKey: ["pos-sessions", "active"], queryFn: posSessionsApi.getActive, retry: false });
export const usePosSessions = (filters = {}) => useQuery({ queryKey: ["pos-sessions", filters], queryFn: () => posSessionsApi.list(filters), placeholderData: (previous) => previous });
function useSessionMutation(mutationFn, success) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pos-sessions"] }); toast.success(success); }, onError: (error) => toast.error(error.response?.data?.message || "Failed to update cash register") });
}
export const useOpenPosSession = () => useSessionMutation(posSessionsApi.open, "Cash Register Opened");
export const useClosePosSession = () => useSessionMutation(posSessionsApi.close, "Cash Register Closed");
