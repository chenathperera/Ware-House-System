import ProtectedRoute from "../../components/auth/ProtectedRoute.jsx";
import { PRICE_CHECKER_ROLES } from "../../client/auth/access.js";
export default function PriceChecker(){return <ProtectedRoute allowedRoles={PRICE_CHECKER_ROLES}><main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><p className="rounded-lg border bg-white p-6 text-gray-700">Price Checker migration placeholder</p></main></ProtectedRoute>;}
