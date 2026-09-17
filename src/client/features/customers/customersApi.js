import api from "../../api/axios.js";

export const customersApi = {
  list: async (params = {}) => (await api.get("/customers", { params })).data,
  getById: async (id) => (await api.get(`/customers/${id}`)).data,
  create: async (data) => (await api.post("/customers", data)).data,
  update: async (id, data) => (await api.put(`/customers/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/customers/${id}`)).data,
  toggleCreditHold: async (id, reason) =>
    (await api.patch(`/customers/${id}/credit-hold`, { reason })).data,
};
