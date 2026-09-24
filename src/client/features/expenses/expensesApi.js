import api from "../../api/axios.js";

export const expensesApi = {
  create: async (data) => {
    const response = await api.post("/expenses", data);
    return response.data;
  },
  list: async (params = {}) => {
    const response = await api.get("/expenses", { params });
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get("/expenses/categories");
    return response.data;
  },
};
