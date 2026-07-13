import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Profile = () => {
  const { user, logout } = useAuth();

  const pointsBalance = user?.points_balance
    ? Number(user.points_balance).toLocaleString("en-IN")
    : "0";
  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="ot-page">
      <h1 className="ot-page-title">Profile</h1>

      <div className="ot-profile-card">
        <div className="ot-profile-avatar">{firstLetter}</div>
        <p className="ot-profile-name">{user?.name || "User"}</p>
        <p className="ot-profile-id">User ID: {user?.id?.substring(0, 8).toUpperCase() || ""}</p>
        <p className="ot-profile-email">{user?.email || ""}</p>
      </div>

      <div className="ot-stats-card">
        <div className="ot-stat-row">
          <span>Points Balance</span>
          <strong>{pointsBalance} pts</strong>
        </div>
        <div className="ot-stat-row">
          <span>Total Trades</span>
          <strong>{user?.total_trades ?? 0}</strong>
        </div>
        <div className="ot-stat-row">
          <span>Wins</span>
          <strong>{user?.wins ?? 0}</strong>
        </div>
        <div className="ot-stat-row">
          <span>Losses</span>
          <strong>{user?.losses ?? 0}</strong>
        </div>
      </div>

      <div className="ot-menu-card">
        <Link to="/wallet" className="ot-menu-item">
          💎 Points
        </Link>
        <Link to="/portfolio" className="ot-menu-item">
          📜 Trade History
        </Link>
        <Link to="/redeem" className="ot-menu-item">
          🏦 Redeem Request
        </Link>
        <a
          href="#"
          className="ot-menu-item"
          onClick={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          🚪 Logout
        </a>
      </div>
    </div>
  );
};

export default Profile;
