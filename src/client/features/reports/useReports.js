"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "./reportsApi.js";

const useReportQuery = (key, queryFn) => useQuery({ queryKey: ["reports", key], queryFn });

export const useSalesSummary = (params = {}) => useReportQuery(["sales-summary", params], () => reportsApi.salesSummary(params));
export const useSalesByProduct = (params = {}) => useReportQuery(["sales-by-product", params], () => reportsApi.salesByProduct(params));
export const useSalesByCustomer = (params = {}) => useReportQuery(["sales-by-customer", params], () => reportsApi.salesByCustomer(params));
export const useSalesTrend = (params = {}) => useReportQuery(["sales-trend", params], () => reportsApi.salesTrend(params));
export const useStockValuation = (params = {}) => useReportQuery(["stock-valuation", params], () => reportsApi.stockValuation(params));
export const useStockMovement = (params = {}) => useReportQuery(["stock-movement", params], () => reportsApi.stockMovement(params));
export const useSlowFastMovers = (params = {}) => useReportQuery(["slow-fast-movers", params], () => reportsApi.slowFastMovers(params));
export const useLowStockReport = () => useReportQuery(["low-stock"], reportsApi.lowStock);
export const useProductionSummary = (params = {}) => useReportQuery(["production-summary", params], () => reportsApi.productionSummary(params));
export const useProductionByProduct = (params = {}) => useReportQuery(["production-by-product", params], () => reportsApi.productionByProduct(params));
export const useProductionWastage = (params = {}) => useReportQuery(["production-wastage", params], () => reportsApi.productionWastage(params));
export const useReturnsSummary = (params = {}) => useReportQuery(["returns-summary", params], () => reportsApi.returnsSummary(params));
export const useDamagesReport = (params = {}) => useReportQuery(["damages-summary", params], () => reportsApi.damagesSummary(params));
export const useFinancialSnapshot = (params = {}) => useReportQuery(["financial-snapshot", params], () => reportsApi.financialSnapshot(params));
export const useProfitAndLoss = (params = {}) => useReportQuery(["profit-and-loss", params], () => reportsApi.profitAndLoss(params));
export const useHeadcountReport = () => useReportQuery(["headcount"], reportsApi.headcount);
export const useAttendanceReport = (params = {}) => useReportQuery(["attendance-summary", params], () => reportsApi.attendanceSummary(params));
export const useLeavePatternsReport = (params = {}) => useReportQuery(["leave-patterns", params], () => reportsApi.leavePatterns(params));
export const usePayrollSummaryReport = (params = {}) => useReportQuery(["payroll-summary", params], () => reportsApi.payrollSummary(params));
