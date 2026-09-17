import api from "../../api/axios.js";

export const settingsApi = {
  getCompanySettings: async () => (await api.get("/settings/company")).data,
  updateCompanySettings: async (data) => (await api.put("/settings/company", data)).data,
};
