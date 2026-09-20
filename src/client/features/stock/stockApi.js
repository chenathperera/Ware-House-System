import api from "../../api/axios.js";

export const stockApi = {
  list: async (params = {}) => (await api.get("/stock", { params })).data,
  byProduct: async (productId) =>
    (await api.get(`/stock/by-product/${productId}`)).data,
  movements: async (params = {}) =>
    (await api.get("/stock/movements", { params })).data,
  reservations: async (params = {}) =>
    (await api.get("/stock/reservations", { params })).data,
  openingStock: async (data) => (await api.post("/stock/opening", data)).data,
  transfer: async (data) => (await api.post("/stock/transfer", data)).data,
  adjust: async (data) => (await api.post("/stock/adjustment", data)).data,
};
