import api from "../../api/axios.js";
export const suppliersApi = {
  list: async (params = {}) => (await api.get("/suppliers", { params })).data,
  create: async (data) => (await api.post("/suppliers", data)).data,
  update: async (id, data) => (await api.put(`/suppliers/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/suppliers/${id}`)).data,
};
