import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";

/**
 * Gates the /admin route. Any role other than "user" (i.e. super_admin,
 * ops_admin, market_admin, risk_admin) can enter the admin shell; what they
 * see INSIDE the shell is further restricted per-tab/per-action via <Can>
 * and usePermissions() in Admin.jsx, based on real granted permissions,
 * not just "is some kind of admin".
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isAnyAdmin, loading } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (loading) {
    return <div className="ot-route-loading">Checking access...</div>;
  }

  if (!isAnyAdmin) {
    return <Navigate to="/markets" replace />;
  }

  return children;
};

export default AdminRoute;
