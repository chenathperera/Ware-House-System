import api from "../../api/axios.js";
export const supplierReturnsApi = {
  list: async (params = {}) => (await api.get("/supplier-returns", { params })).data,
  getById: async (id) => (await api.get(`/supplier-returns/${id}`)).data,
  create: async (data) => (await api.post("/supplier-returns", data)).data,
  send: async (id) => (await api.patch(`/supplier-returns/${id}/send`)).data,
  recordCredit: async (id, data) => (await api.patch(`/supplier-returns/${id}/record-credit`, data)).data,
};
