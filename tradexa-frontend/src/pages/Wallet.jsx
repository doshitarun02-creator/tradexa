import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import client from "../api/client";

const Wallet = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = async () => {
    try {
      const response = await client.get("/my-trades", { params: { limit: 10 } });
      const root = response?.data?.data ?? response?.data ?? {};
      setTrades(root.trades || []);
    } catch {
      // silent fallback, empty history shown
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const totalPointsWon = trades
    .filter((t) => t.status === "settled" && Number(t.pnl || 0) > 0)
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  const totalPointsLost = trades
    .filter((t) => t.status === "settled" && Number(t.pnl || 0) <= 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.pnl || 0)), 0);

  const pointsBalance = user?.points_balance
    ? Number(user.points_balance).toLocaleString("en-IN")
    : "0";

  return (
    <div className="ot-page">
      <h1 className="ot-page-title">Points</h1>

      <div className="ot-balance-card">
        <p className="ot-balance-label">Available Points</p>
        <p className="ot-balance-value">{pointsBalance} pts</p>
        <div className="ot-balance-actions">
          <Link to="/redeem" className="ot-btn-secondary">
            Redeem Request
          </Link>
        </div>
      </div>

      <div className="ot-summary-card">
        <h3 className="ot-summary-title">Points Summary</h3>
        <div className="ot-summary-row">
          <span>Points Won</span>
          <span className="ot-credit">+{totalPointsWon.toFixed(0)} pts</span>
        </div>
        <div className="ot-summary-row">
          <span>Points Lost</span>
          <span className="ot-debit">-{totalPointsLost.toFixed(0)} pts</span>
        </div>
      </div>

      <div className="ot-transactions-card">
        <h3 className="ot-summary-title">Recent Activity</h3>
        {loading ? (
          <p className="ot-empty-state">Loading activity...</p>
        ) : trades.length === 0 ? (
          <p className="ot-empty-state">No activity found.</p>
        ) : (
          trades.map((trade) => {
            const isSettled = trade.status === "settled";
            const isWin = isSettled && Number(trade.pnl || 0) > 0;
            const title = isSettled ? (isWin ? "Points Won" : "Points Lost") : "Bet Placed";
            const amountClass = isWin ? "ot-credit" : "ot-debit";
            const amountPrefix = isWin ? "+" : "-";
            const amountValue = isSettled
              ? Math.abs(trade.pnl).toFixed(0)
              : trade.total_cost?.toFixed(0);

            return (
              <div className="ot-transaction-row" key={trade.id || trade._id}>
                <div>
                  <p className="ot-transaction-title">{title}</p>
                  <p className="ot-transaction-sub">{trade.market?.question}</p>
                </div>
                <span className={amountClass}>
                  {amountPrefix}
                  {amountValue} pts
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Wallet;
