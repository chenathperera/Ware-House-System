import api from "../../api/axios.js";
export const usersApi = {
  list: async (params = {}) => (await api.get("/users", { params })).data,
  getById: async (id) => (await api.get(`/users/${id}`)).data,
  update: async (id, data) => (await api.put(`/users/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/users/${id}`)).data,
  register: async (data) => (await api.post("/auth/register", data)).data,
};
