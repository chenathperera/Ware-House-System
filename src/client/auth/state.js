export const initialAuthState = { user: null, token: null, isAuthenticated: false };

export function createAuthActions(set, storage = globalThis.localStorage) {
  return {
    login: (user, token) => {
      storage.setItem("token", token);
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      storage.removeItem("token");
      storage.removeItem("user");
      set(initialAuthState);
    },
    updateUser: (user) => set({ user }),
    setUser: (user) => set({ user }),
  };
}
