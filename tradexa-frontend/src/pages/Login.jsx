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
    <div className="ot-auth-body">
      <div className="ot-auth-card">
        <div className="ot-auth-logo">Tradexa</div>
        <div className="ot-auth-sub">Welcome back! Sign in to continue.</div>

        <form onSubmit={handleSubmit}>
          <label className="ot-auth-label">Email or Mobile</label>
          <input
            type="text"
            className="ot-auth-input"
            placeholder="Enter email or mobile"
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

          <div className="ot-auth-row">
            <label style={{ margin: 0, fontWeight: "normal", display: "flex", alignItems: "center" }}>
              <input type="checkbox" style={{ width: "auto", marginRight: "6px" }} /> Remember me
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Feature coming soon!"); }} style={{ color: "#0b6fa4", textDecoration: "none" }}>
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="ot-auth-button" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="ot-auth-social">
          <button type="button" onClick={() => alert("Google sign-in demo")}>
            Google
          </button>
          <button type="button" onClick={() => alert("OTP Login demo")}>
            OTP Login
          </button>
        </div>

        <div className="ot-auth-links">
          <p>
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>

      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default Login;
