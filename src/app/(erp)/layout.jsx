import ProtectedRoute from "../../components/auth/ProtectedRoute.jsx";
import AppLayout from "../../components/layout/AppLayout.jsx";
import { ERP_ROLES } from "../../client/auth/access.js";
export default function ErpLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={ERP_ROLES}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
