import api from "../../api/axios.js";

export const invoicesApi = {
  async list(params = {}) {
    const response = await api.get("/invoices", { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await api.post("/invoices", data);
    return response.data;
  },

  async changeStatus(id, status, reason) {
    const response = await api.patch(`/invoices/${id}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },
};
