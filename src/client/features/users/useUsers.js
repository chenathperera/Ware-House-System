"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { usersApi } from "./usersApi.js";
export const useUsers = (filters = {}) =>
  useQuery({
    queryKey: ["users", filters],
    queryFn: () => usersApi.list(filters),
    placeholderData: (previous) => previous,
  });
export const useUser = (id) =>
  useQuery({ queryKey: ["user", id], queryFn: () => usersApi.getById(id), enabled: !!id });
function useUserMutation(fn, success, failure) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(success);
    },
    onError: (error) => toast.error(error.response?.data?.message || failure),
  });
}
export const useCreateUser = () =>
  useUserMutation(usersApi.register, "User created", "Failed to create user");
export const useUpdateUser = () =>
  useUserMutation(({ id, data }) => usersApi.update(id, data), "User updated", "Failed to update");
export const useDeleteUser = () => useUserMutation(usersApi.delete, "User deactivated", "Failed");
