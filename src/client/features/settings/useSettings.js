"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "./settingsApi.js";

export const useCompanySettings = () =>
  useQuery({
    queryKey: ["company-settings"],
    queryFn: settingsApi.getCompanySettings,
  });

export const useUpdateCompanySettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.updateCompanySettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
};
