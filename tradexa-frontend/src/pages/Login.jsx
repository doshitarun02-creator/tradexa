import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LockKeyhole, Sparkles } from "lucide-react";
import useAuth from "../hooks/useAuth";
import Toast from "../components/Toast";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/markets";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setToast({
        id: Date.now(),
        type: "error",
        title: "Login failed",
        message: res.message || "Invalid credentials",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border bg-surface/80 shadow-soft-lg p-8 relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-64 opacity-40">
          <div className="h-64 w-64 bg-primary/20 blur-3xl mx-auto" />
        </div>

        <div className="relative flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/40">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
              TradeXa
            </div>
            <div className="text-lg font-semibold text-slate-50">
              Dark Finance Terminal
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 mb-6">
          <LockKeyhole className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-slate-50">Welcome back</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg bg-slate-900/70 border border-border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-transparent"
              placeholder="you@tradexa.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300">Password</label>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-slate-900/70 border border-border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-transparent"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-primary text-slate-950 text-sm font-medium py-2.5 hover:bg-teal-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          New to TradeXa?{" "}
          <Link
            to="/register"
            className="text-primary hover:text-teal-300 font-medium"
          >
            Create account
          </Link>
        </p>
      </motion.div>

      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Login;
