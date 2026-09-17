"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Package } from "lucide-react";
import { authApi } from "../../client/features/auth/authApi.js";
import { loginSchema } from "../../client/features/auth/authSchemas.js";
import { getLoginDestination } from "../../client/auth/access.js";
import { useAuthStore } from "../../client/store/authStore.js";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) return undefined;
    if (persist.hasHydrated()) setHydrated(true);
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      const { token, ...user } = response.data;
      login(user, token);
      toast.success(`Welcome back, ${user.firstName}!`);
      router.push(getLoginDestination(user));
    },
    onError: (error) => toast.error(error.response?.data?.message || "Login failed"),
  });

  useEffect(() => {
    if (hydrated && isAuthenticated)
      router.replace(getLoginDestination(useAuthStore.getState().user));
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Wholesale System</h1>
          <p className="mt-1 text-sm text-gray-600">Manufacturing &amp; Distribution</p>
        </div>
        <Card className="p-8">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Sign in</h2>
          <p className="mb-6 text-sm text-gray-500">
            Enter your credentials to access your account
          </p>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <div className="relative">
              <Input
                label="Password"
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                required
                error={errors.password?.message}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button type="submit" fullWidth loading={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-gray-500">
            Forgot your password? Contact your administrator.
          </p>
        </Card>
        <p className="mt-6 text-center text-xs text-gray-500">
          © 2026 Wholesale System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
