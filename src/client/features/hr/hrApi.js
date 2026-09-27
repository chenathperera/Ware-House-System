import api from "../../api/axios.js";

const resource = (path) => ({
  list: async (params = {}) => (await api.get(path, { params })).data,
  getById: async (id) => (await api.get(`${path}/${id}`)).data,
  create: async (data) => (await api.post(path, data)).data,
  update: async (id, data) => (await api.put(`${path}/${id}`, data)).data,
  delete: async (id) => (await api.delete(`${path}/${id}`)).data,
});
export const departmentsApi = resource("/departments");
export const designationsApi = resource("/designations");
export const employeesApi = resource("/employees");
export const shiftsApi = resource("/shifts");
