import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Toast from "../components/Toast";

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/markets" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
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
    <div className="ot-auth-body">
      <div className="ot-auth-card" style={{ marginTop: "20px", marginBottom: "20px" }}>
        <div className="ot-auth-logo" style={{ marginBottom: "8px" }}>Tradexa</div>
        <div className="ot-auth-sub">Create your account</div>

        <form onSubmit={handleSubmit}>
          <label className="ot-auth-label">Full Name</label>
          <input
            type="text"
            className="ot-auth-input"
            placeholder="Enter your full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="ot-auth-label">Mobile Number</label>
          <input
            type="tel"
            className="ot-auth-input"
            placeholder="Enter mobile number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label className="ot-auth-label">Email Address</label>
          <input
            type="email"
            className="ot-auth-input"
            placeholder="Enter email"
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

          <label className="ot-auth-label">Referral Code (Optional)</label>
          <input
            type="text"
            className="ot-auth-input"
            placeholder="Referral code"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />

          <label className="ot-auth-label" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal" }}>
            <input type="checkbox" style={{ width: "auto" }} required />
            I agree to the Terms & Conditions
          </label>

          <button type="submit" className="ot-auth-button" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <small style={{ display: "block", marginTop: "12px", color: "#666", textAlign: "center" }}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </small>

        <div className="ot-auth-links">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>

      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default Register;
