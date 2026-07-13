import React from "react";
import { Link } from "react-router-dom";

const BottomNav = ({ active }) => {
  return (
    <nav className="ot-bottom-nav">
      <Link to="/markets" className={active === "home" ? "active" : ""}>🏠<br/>Home</Link>
      <Link to="/markets?view=list" className={active === "markets" ? "active" : ""}>📈<br/>Markets</Link>
      <Link to="/wallet" className={active === "wallet" ? "active" : ""}>💼<br/>Wallet</Link>
      <Link to="/activity" className={active === "history" ? "active" : ""}>📜<br/>History</Link>
      <Link to="/profile" className={active === "profile" ? "active" : ""}>👤<br/>Profile</Link>
    </nav>
  );
};

export default BottomNav;
