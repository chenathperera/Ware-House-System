import api from "../../api/axios.js";

export const customerGroupsApi = {
  list: async (params = {}) => (await api.get("/customer-groups", { params })).data,
  getById: async (id) => (await api.get(`/customer-groups/${id}`)).data,
  create: async (data) => (await api.post("/customer-groups", data)).data,
  update: async (id, data) => (await api.put(`/customer-groups/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/customer-groups/${id}`)).data,
};
