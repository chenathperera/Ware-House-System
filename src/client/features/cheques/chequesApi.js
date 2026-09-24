import api from "../../api/axios.js";

export const chequesApi = {
  list: async (params = {}) => (await api.get("/cheques", { params })).data,
  updateStatus: async ({ id, data }) =>
    (await api.put(`/cheques/${id}/status`, data)).data,
  remove: async (id) => (await api.delete(`/cheques/${id}`)).data,
};
