import api from "../../api/axios.js";

export const posSessionsApi = {
  getActive: async () => (await api.get("/pos-sessions/active")).data,
  open: async (data) => (await api.post("/pos-sessions/open", data)).data,
  close: async (data) => (await api.post("/pos-sessions/close", data)).data,
  list: async (params = {}) => (await api.get("/pos-sessions", { params })).data,
};
