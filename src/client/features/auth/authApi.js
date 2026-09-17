import api from "../../api/axios.js";

export const authApi = {
  login: async (credentials) => (await api.post("/auth/login", credentials)).data,
  register: async (userData) => (await api.post("/auth/register", userData)).data,
  getMe: async () => (await api.get("/auth/me")).data,
  logout: async () => (await api.post("/auth/logout")).data,
};
