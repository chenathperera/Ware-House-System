import api from "../../api/axios.js";

export const bankAccountsApi = {
  list: async (params = {}) => (await api.get("/bank-accounts", { params })).data,
  getById: async (id) => (await api.get(`/bank-accounts/${id}`)).data,
  create: async (data) => (await api.post("/bank-accounts", data)).data,
  update: async ({ id, data }) => (await api.put(`/bank-accounts/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/bank-accounts/${id}`)).data,
};
