import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Toast from "../components/Toast";

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/markets" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({
        id: Date.now(),
        type: "error",
        title: "Password mismatch",
        message: "Passwords do not match!",
      });
      return;
    }
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
    <div className="ot-auth-page">
      <div className="ot-auth-card">
        <h1 className="ot-auth-brand">Tradexa</h1>
        <p className="ot-auth-subtitle">Create your account to start trading with points.</p>
        <form onSubmit={handleSubmit} className="ot-auth-form">
          <label className="ot-auth-label">Full Name</label>
          <input
            type="text"
            className="ot-auth-input"
            placeholder="Enter your full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="ot-auth-label">Email Address</label>
          <input
            type="email"
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
            placeholder="Create password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="ot-auth-label">Confirm Password</label>
          <input
            type="password"
            className="ot-auth-input"
            placeholder="Confirm password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <label className="ot-auth-checkbox-row">
            <input type="checkbox" required />
            I agree to the Terms & Conditions
          </label>
          <button type="submit" className="ot-auth-submit" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <p className="ot-auth-fine-print">
          New accounts start with a starter points balance. Additional points are credited
          by an administrator after cash is received offline — there is no online payment
          on this platform.
        </p>
        <p className="ot-auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default Register;
