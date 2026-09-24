import api from "../../api/axios.js";

export const fundTransfersApi = {
  list: async () => (await api.get("/fund-transfers")).data,
  create: async (data) => (await api.post("/fund-transfers", data)).data,
  update: async ({ id, data }) =>
    (await api.put(`/fund-transfers/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/fund-transfers/${id}`)).data,
};
