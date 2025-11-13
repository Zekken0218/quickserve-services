import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Redirect admins away from selected non-admin routes after auth state settles
const AdminRedirect = () => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const path = location.pathname;
    if (user && isAdmin) {
      const nonAdminRoutes = new Set<string>([
        "/",
        "/login",
        "/register",
        "/services",
        "/bookings",
        "/profile",
      ]);
      if (nonAdminRoutes.has(path)) {
        navigate("/admin", { replace: true });
      }
    }
  }, [user, loading, isAdmin, location.pathname, navigate]);

  return null;
};

export default AdminRedirect;
