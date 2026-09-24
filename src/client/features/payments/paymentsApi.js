import api from "../../api/axios.js";

export const paymentsApi = {
  list: async (params = {}) => {
    const response = await api.get("/payments", { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("/payments", data);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },
};
