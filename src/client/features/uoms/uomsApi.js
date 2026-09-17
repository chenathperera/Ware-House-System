import api from "../../api/axios.js";

export const uomsApi = {
  list: async (params = {}) => {
    const response = await api.get("/uoms", { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("/uoms", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/uoms/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/uoms/${id}`);
    return response.data;
  },
};
