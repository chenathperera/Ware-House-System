import api from "../../api/axios.js";
export const creditNotesApi = {
  list: async (params = {}) => (await api.get("/credit-notes", { params })).data,
  getById: async (id) => (await api.get(`/credit-notes/${id}`)).data,
  create: async (data) => (await api.post("/credit-notes", data)).data,
  apply: async (id, data) => (await api.post(`/credit-notes/${id}/apply`, data)).data,
};
