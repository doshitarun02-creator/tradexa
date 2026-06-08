import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus2, Sparkles } from "lucide-react";
import useAuth from "../hooks/useAuth";
import Toast from "../components/Toast";

const getPasswordScore = (password) => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
};

const strengthConfig = [
  { label: "Too weak", color: "bg-red-500" },
  { label: "Weak", color: "bg-orange-400" },
  { label: "Medium", color: "bg-yellow-400" },
  { label: "Strong", color: "bg-emerald-400" },
  { label: "Very strong", color: "bg-teal-400" },
];

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/markets" replace />;
  }

  const score = useMemo(() => getPasswordScore(password), [password]);
  const strength = strengthConfig[score] || strengthConfig[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await register(name, email, password);
    setSubmitting(false);
    if (res.success) {
      navigate("/markets", { replace: true });
    } else {
      setToast({
        id: Date.now(),
        type: "error",
        title: "Registration failed",
        message: res.message || "Please try again",
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
              Join the markets
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 mb-6">
          <UserPlus2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-slate-50">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Name</label>
            <input
              type="text"
              required
              minLength={2}
              className="w-full rounded-lg bg-slate-900/70 border border-border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-transparent"
              placeholder="Satoshi Nakamoto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg bg-slate-900/70 border border-border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-transparent"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Password strength</span>
                <span className="text-xs text-slate-300">{strength.label}</span>
              </div>
              <div className="flex gap-1 h-1.5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full ${
                      idx < score ? strength.color : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-primary text-slate-950 text-sm font-medium py-2.5 hover:bg-teal-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Already on TradeXa?{" "}
          <Link
            to="/login"
            className="text-primary hover:text-teal-300 font-medium"
          >
            Sign in
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

export default Register;
