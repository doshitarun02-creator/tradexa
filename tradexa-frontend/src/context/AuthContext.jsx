import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

export const AuthContext = createContext(null);

const USER_KEY = "tradexa_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = window.sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      if (res.data?.success) {
        const nextUser = res.data.data.user;
        setUser(nextUser);
        window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } else {
        setUser(null);
        window.sessionStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      setUser(null);
      window.sessionStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      // ignore logout failure, proceed to clear local state
    } finally {
      setUser(null);
      window.sessionStorage.removeItem(USER_KEY);
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data?.success) {
        const nextUser = res.data.data.user;
        setUser(nextUser);
        window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        return { success: true };
      }
      return { success: false, message: res.data?.message || "Login failed" };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to login. Please try again.";
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/register", { name, email, password });
      if (res.data?.success) {
        const nextUser = res.data.data.user;
        setUser(nextUser);
        window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        return { success: true };
      }
      return { success: false, message: res.data?.message || "Registration failed" };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to register. Please try again.";
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePoints = useCallback((newPointsBalance) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, points_balance: newPointsBalance };
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      register,
      updatePoints,
      refreshMe,
    }),
    [user, loading, login, logout, register, updatePoints, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
