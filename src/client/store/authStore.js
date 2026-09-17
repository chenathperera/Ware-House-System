"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialAuthState, createAuthActions } from "../auth/state.js";

export const useAuthStore = create(
  persist((set) => ({ ...initialAuthState, ...createAuthActions(set) }), { name: "auth-storage" }),
);
