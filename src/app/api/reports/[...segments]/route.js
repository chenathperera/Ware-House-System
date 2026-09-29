import { apiHandler } from "../../../../server/http/handler.js";
import {
  getDamagesReport,
  getFinancialSnapshot,
  getHeadcountReport,
  getAttendanceReport,
  getLeavePatternsReport,
  getPayrollSummaryReport,
  getLowStockReport,
  getProductionByProduct,
  getProductionSummary,
  getProductionWastage,
  getReturnsSummary,
  getSalesByCustomer,
  getSalesByProduct,
  getSalesSummary,
  getSalesTrend,
  getSlowFastMovers,
  getStockMovement,
  getStockValuation,
} from "../../../../server/services/reportsApiService.js";

export const runtime = "nodejs";

const services = {
  "sales/summary": getSalesSummary,
  "sales/by-product": getSalesByProduct,
  "sales/by-customer": getSalesByCustomer,
  "sales/trend": getSalesTrend,
  "inventory/valuation": getStockValuation,
  "inventory/movement": getStockMovement,
  "inventory/slow-fast-movers": getSlowFastMovers,
  "inventory/low-stock": getLowStockReport,
  "production/summary": getProductionSummary,
  "production/by-product": getProductionByProduct,
  "production/wastage": getProductionWastage,
  "returns/summary": getReturnsSummary,
  "damages/summary": getDamagesReport,
  "financial/snapshot": getFinancialSnapshot,
  "hr/headcount": getHeadcountReport,
  "hr/attendance-summary": getAttendanceReport,
  "hr/leave-patterns": getLeavePatternsReport,
  "hr/payroll-summary": getPayrollSummaryReport,
};

export async function GET(request, context) {
  const { segments } = await context.params;
  const service = services[segments.join("/")];
  if (!service) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return apiHandler(service, { auth: true })(request, context);
}
