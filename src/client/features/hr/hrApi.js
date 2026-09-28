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
export const attendanceApi = {
  list: (params = {}) => api.get("/attendance", { params }).then((r) => r.data),
  mark: (data) => api.post("/attendance", data).then((r) => r.data),
  bulkMark: (data) => api.post("/attendance/bulk", data).then((r) => r.data),
};
export const leavesApi = {
  list: (params = {}) => api.get("/leaves", { params }).then((r) => r.data),
  create: (data) => api.post("/leaves", data).then((r) => r.data),
  approve: (id) => api.patch(`/leaves/${id}/approve`).then((r) => r.data),
  reject: ({ id, reason }) => api.patch(`/leaves/${id}/reject`, { reason }).then((r) => r.data),
  cancel: (id) => api.patch(`/leaves/${id}/cancel`).then((r) => r.data),
};
export const holidaysApi = resource("/holidays");
export const salaryStructuresApi = resource("/salary-structures");
export const payrollApi = {
  list: (params = {}) => api.get("/payroll", { params }).then((response) => response.data),
  getById: (id) => api.get(`/payroll/${id}`).then((response) => response.data),
  process: (data) => api.post("/payroll/process", data).then((response) => response.data),
  preview: (data) => api.post("/payroll/preview", data).then((response) => response.data),
  approve: (id) => api.patch(`/payroll/${id}/approve`).then((response) => response.data),
  markPaid: (id) => api.patch(`/payroll/${id}/mark-paid`).then((response) => response.data),
  getPayslip: (payrollId, employeeId) => api.get(`/payroll/${payrollId}/payslip/${employeeId}`).then((response) => response.data),
};
