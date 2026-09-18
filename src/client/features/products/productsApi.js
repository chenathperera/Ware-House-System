import api from "../../api/axios.js";

export const productsApi = {
  list: async (params = {}) => (await api.get("/products", { params })).data,
  getById: async (id) => (await api.get(`/products/${id}`)).data,
  create: async (data) => (await api.post("/products", data)).data,
  update: async (id, data) => (await api.put(`/products/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/products/${id}`)).data,
  listCategories: async (params = {}) =>
    (await api.get("/categories", { params })).data,
  createCategory: async (data) => (await api.post("/categories", data)).data,
  updateCategory: async (id, data) =>
    (await api.put(`/categories/${id}`, data)).data,
  deleteCategory: async (id) => (await api.delete(`/categories/${id}`)).data,
  listBrands: async () => (await api.get("/brands")).data,
  createBrand: async (data) => (await api.post("/brands", data)).data,
  updateBrand: async (id, data) => (await api.put(`/brands/${id}`, data)).data,
  deleteBrand: async (id) => (await api.delete(`/brands/${id}`)).data,
  listUoms: async () => (await api.get("/uoms")).data,
};
