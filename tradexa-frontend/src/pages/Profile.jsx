import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Profile = () => {
  const { user, logout } = useAuth();

  const mockStats = {
    mobile: "+91 9876543210",
    kycStatus: "Verified",
    totalTrades: 124,
    winningRate: "73%",
  };

  const walletBalance = user?.wallet ? Number(user.wallet).toLocaleString("en-IN") : "0";
  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div>
      <header className="ot-header">
        <b>Profile</b>
      </header>

      <div className="ot-wrap">
        {/* User Card */}
        <div className="ot-card">
          <div className="ot-profile-card">
            <div className="ot-avatar">{firstLetter}</div>
            <div>
              <div className="ot-name">{user?.name || "User"}</div>
              <div className="ot-id-label">User ID: OT-{user?.id?.substring(0, 6).toUpperCase() || "102548"}</div>
              <div className="ot-id-label">{user?.email || "trader@email.com"}</div>
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="ot-card">
          <div className="ot-menu-row">
            <span>Mobile</span>
            <b>{mockStats.mobile}</b>
          </div>
          <div className="ot-menu-row">
            <span>KYC Status</span>
            <b style={{ color: "green" }}>{mockStats.kycStatus}</b>
          </div>
          <div className="ot-menu-row">
            <span>Wallet Balance</span>
            <b>₹{walletBalance}</b>
          </div>
          <div className="ot-menu-row">
            <span>Total Trades</span>
            <b>{mockStats.totalTrades}</b>
          </div>
          <div className="ot-menu-row">
            <span>Winning Rate</span>
            <b>{mockStats.winningRate}</b>
          </div>
        </div>

        {/* Action Menu */}
        <div className="ot-card" style={{ padding: "8px 18px" }}>
          <Link to="/wallet" className="ot-menu-a">💼 Wallet</Link>
          <Link to="/activity" className="ot-menu-a">📜 Trade History</Link>
          <Link to="/wallet" className="ot-menu-a">💳 Deposit</Link>
          <Link to="/withdraw" className="ot-menu-a">🏦 Withdraw</Link>
          <a href="#" className="ot-menu-a">🔔 Notifications</a>
          <a href="#" className="ot-menu-a">⚙ Settings</a>
          <a href="#" className="ot-menu-a">🎧 Support</a>
          <a href="#" className="ot-logout-btn" onClick={(e) => { e.preventDefault(); logout(); }}>
            Logout
          </a>
        </div>
      </div>

    </div>
  );
};

export default Profile;
