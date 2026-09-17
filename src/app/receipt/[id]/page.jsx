import ProtectedRoute from "../../../components/auth/ProtectedRoute.jsx";
import { ERP_ROLES } from "../../../client/auth/access.js";
export default function Receipt() {
  return (
    <ProtectedRoute allowedRoles={ERP_ROLES}>
      <main className="p-6">Receipt printing migration placeholder</main>
    </ProtectedRoute>
  );
}
