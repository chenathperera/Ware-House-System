"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../client/store/authStore.js";
import { getProtectedRouteDecision } from "../../client/auth/access.js";

export default function ProtectedRoute({ children, allowedRoles }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) return undefined;
    if (persist.hasHydrated()) setHydrated(true);
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);
  const decision = hydrated
    ? getProtectedRouteDecision({ isAuthenticated, user, allowedRoles })
    : "pending";

  useEffect(() => {
    if (decision === "login") router.replace("/login");
    if (decision === "unauthorized") {
      console.warn("Access Denied: User role not authorized", {
        userRole: user?.role,
        allowedRoles,
        path: pathname,
      });
      router.replace("/unauthorized");
    }
  }, [decision, router, pathname, user?.role, allowedRoles]);

  if (decision !== "allow") return null;
  return children;
}
