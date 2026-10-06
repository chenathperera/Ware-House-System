"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  ChartNoAxesColumnIncreasing,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Package,
  ShoppingCart,
} from "lucide-react";
import { authApi } from "../../client/features/auth/authApi.js";
import { loginSchema } from "../../client/features/auth/authSchemas.js";
import { getLoginDestination } from "../../client/auth/access.js";
import { useAuthStore } from "../../client/store/authStore.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import asipbookLogo from "./assets/asipbook-logo.png";
import styles from "./page.module.css";

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
    <main className={styles.page}>
      <div className={styles.topRing} aria-hidden="true" />
      <div className={styles.bottomCurve} aria-hidden="true" />
      <div className={styles.bottomAccent} aria-hidden="true" />
      <div className={styles.rightCurve} aria-hidden="true" />

      <div className={styles.content}>
        <section className={styles.branding} aria-labelledby="login-title">
          <Image
            src={asipbookLogo}
            alt="Asipbook Business Management System"
            className={styles.brandLogo}
            priority
          />
          <div className={styles.brandText}>
            <h1 id="login-title" className={styles.title}>
              Asipbook <span>ERP System</span>
            </h1>
            <p className={styles.subtitle}>
              Smart wholesale inventory, POS, and financial management.
            </p>
          </div>

          <div className={styles.features} aria-label="Asipbook features">
            <div className={styles.feature}>
              <span className={`${styles.featureIcon} ${styles.posIcon}`}>
                <ShoppingCart size={27} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span>Real-Time POS</span>
            </div>
            <div className={styles.feature}>
              <span className={`${styles.featureIcon} ${styles.stockIcon}`}>
                <Package size={27} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span>Multi-Warehouse Stock</span>
            </div>
            <div className={styles.feature}>
              <span className={`${styles.featureIcon} ${styles.financeIcon}`}>
                <ChartNoAxesColumnIncreasing
                  size={27}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>
              <span>Integrated Finance</span>
            </div>
          </div>
        </section>

        <div className={styles.authColumn}>
          <section className={styles.card} aria-labelledby="welcome-title">
            <Image
              src={asipbookLogo}
              alt="Asipbook Business Management System"
              className={styles.mobileLogo}
            />
            <div className={styles.formIntro}>
              <h2 id="welcome-title">Welcome back</h2>
              <p>Sign in to continue to your workspace.</p>
            </div>

            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className={styles.form}
            >
              <div className={styles.inputGroup}>
                <Mail className={styles.inputIcon} size={19} aria-hidden="true" />
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@asipbook.com"
                  required
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>

              <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
                <LockKeyhole className={styles.inputIcon} size={19} aria-hidden="true" />
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
                  className={styles.visibilityToggle}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={mutation.isPending}
                className={styles.submitButton}
              >
                {mutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className={styles.helpText}>
              Forgot your password? <span>Contact administrator.</span>
            </p>
          </section>

          <footer className={styles.footer}>© 2026 Asipbook. All rights reserved.</footer>
        </div>
      </div>
    </main>
  );
}
