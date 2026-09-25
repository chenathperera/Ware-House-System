import api from "../../api/axios.js";

export const returnsApi = {
  list: async (params = {}) => (await api.get("/customer-returns", { params })).data,
  getById: async (id) => (await api.get(`/customer-returns/${id}`)).data,
  create: async (data) => (await api.post("/customer-returns", data)).data,
  approve: async (id) => (await api.patch(`/customer-returns/${id}/approve`)).data,
  reject: async (id, reason) => (await api.patch(`/customer-returns/${id}/reject`, { reason })).data,
  receive: async (id, data) => (await api.patch(`/customer-returns/${id}/receive`, data)).data,
  process: async (id, data) => (await api.patch(`/customer-returns/${id}/process`, data)).data,
  issueCreditNote: async (id) => (await api.patch(`/customer-returns/${id}/issue-credit-note`)).data,
  complete: async (id) => (await api.patch(`/customer-returns/${id}/complete`)).data,
  eligibleOrders: async (customerId) => (await api.get("/customer-returns/eligible-orders", { params: { customerId } })).data,
};
