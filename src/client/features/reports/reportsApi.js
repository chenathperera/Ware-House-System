"use client";

import api from "../../api/axios.js";

const get = (path, params) => async () => (await api.get(path, { params })).data;

export const reportsApi = {
  salesSummary: (params = {}) => get("/reports/sales/summary", params)(),
  salesByProduct: (params = {}) => get("/reports/sales/by-product", params)(),
  salesByCustomer: (params = {}) => get("/reports/sales/by-customer", params)(),
  salesTrend: (params = {}) => get("/reports/sales/trend", params)(),
  stockValuation: (params = {}) => get("/reports/inventory/valuation", params)(),
  stockMovement: (params = {}) => get("/reports/inventory/movement", params)(),
  slowFastMovers: (params = {}) => get("/reports/inventory/slow-fast-movers", params)(),
  lowStock: () => get("/reports/inventory/low-stock")(),
  productionSummary: (params = {}) => get("/reports/production/summary", params)(),
  productionByProduct: (params = {}) => get("/reports/production/by-product", params)(),
  productionWastage: (params = {}) => get("/reports/production/wastage", params)(),
  returnsSummary: (params = {}) => get("/reports/returns/summary", params)(),
  damagesSummary: (params = {}) => get("/reports/damages/summary", params)(),
  financialSnapshot: (params = {}) => get("/reports/financial/snapshot", params)(),
  profitAndLoss: (params = {}) => get("/financial-reports/profit-and-loss", params)(),
  headcount: () => get("/reports/hr/headcount")(),
  attendanceSummary: (params = {}) => get("/reports/hr/attendance-summary", params)(),
  leavePatterns: (params = {}) => get("/reports/hr/leave-patterns", params)(),
  payrollSummary: (params = {}) => get("/reports/hr/payroll-summary", params)(),
};
