import React, { createContext, useEffect, useMemo, useState, useCallback } from "react";
import apiClient from "../api/client";
import useAuth from "../hooks/useAuth";

export const PermissionContext = createContext(null);

/**
 * PermissionProvider fetches the caller's role + permission set once
 * (on auth change) from GET /auth/permissions and exposes:
 *   - role: string
 *   - permissions: string[]
 *   - hasPermission(perm): boolean
 *   - hasAnyPermission([perms]): boolean
 *   - loading: boolean
 *
 * This drives all frontend show/hide logic for admin pages and actions.
 * IMPORTANT: this is a UX convenience layer only. The backend re-checks
 * every permission on every request via @require_permission — hiding a
 * button here never substitutes for a real server-side check.
 */
export const PermissionProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setRole(null);
      setPermissions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get("/auth/permissions");
      if (res.data?.success) {
        setRole(res.data.data.role);
        setPermissions(res.data.data.permissions || []);
      }
    } catch (err) {
      setRole(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions, user?.id]);

  const hasPermission = useCallback(
    (permission) => permissions.includes(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (permList = []) => permList.some((p) => permissions.includes(p)),
    [permissions]
  );

  const isAnyAdmin = useMemo(
    () => Boolean(role && role !== "user"),
    [role]
  );

  const value = useMemo(
    () => ({
      role,
      permissions,
      loading,
      hasPermission,
      hasAnyPermission,
      isAnyAdmin,
      refreshPermissions: loadPermissions,
    }),
    [role, permissions, loading, hasPermission, hasAnyPermission, isAnyAdmin, loadPermissions]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
