"use client";
import { useQuery } from "@tanstack/react-query";
import { uomsApi } from "./uomsApi.js";

export const useUoms = (params = {}) =>
  useQuery({
    queryKey: ["uoms", params],
    queryFn: () => uomsApi.list(params),
    staleTime: 10 * 60 * 1000,
  });
