import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
    <div className="ot-auth-page">
      <div className="ot-auth-card">
        <h1 className="ot-auth-brand">Tradexa</h1>
        <p className="ot-auth-subtitle">Welcome back! Sign in to place bets and check your points.</p>
        <form onSubmit={handleSubmit} className="ot-auth-form">
          <label className="ot-auth-label">Email</label>
          <input
            type="text"
            className="ot-auth-input"
            placeholder="Enter email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="ot-auth-label">Password</label>
          <input
            type="password"
            className="ot-auth-input"
            placeholder="Enter password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="ot-auth-submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="ot-auth-footer">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Login;
