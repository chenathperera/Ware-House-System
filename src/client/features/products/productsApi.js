import api from "../../api/axios.js";
export const productsApi = {
  list: async (params = {}) => (await api.get("/products", { params })).data,
  create: async (data) => (await api.post("/products", data)).data,
  update: async (id, data) => (await api.put(`/products/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/products/${id}`)).data,
};
