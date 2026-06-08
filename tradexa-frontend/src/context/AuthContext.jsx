import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

export const AuthContext = createContext(null);

const TOKEN_KEY = "tradexa_token";
const USER_KEY = "tradexa_user";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => window.sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = window.sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistAuth = (nextToken, nextUser) => {
    if (nextToken) {
      window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
    if (nextUser) {
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      window.sessionStorage.removeItem(USER_KEY);
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    persistAuth(null, null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data?.success) {
        const nextToken = res.data.data.token;
        const nextUser = res.data.data.user;
        setToken(nextToken);
        setUser(nextUser);
        persistAuth(nextToken, nextUser);
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
        const nextToken = res.data.data.token;
        const nextUser = res.data.data.user;
        setToken(nextToken);
        setUser(nextUser);
        persistAuth(nextToken, nextUser);
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

  const updateWallet = useCallback((newWallet) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, wallet: newWallet };
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/auth/me");
      if (res.data?.success) {
        setUser(res.data.data.user);
        window.sessionStorage.setItem(USER_KEY, JSON.stringify(res.data.data.user));
      }
    } catch (err) {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      logout,
      register,
      updateWallet,
    }),
    [user, token, loading, login, logout, register, updateWallet]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
