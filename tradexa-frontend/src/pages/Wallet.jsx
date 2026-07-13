import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import client from "../api/client";

const Wallet = () => {
  const { user, updateWallet } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = async () => {
    try {
      const response = await client.get("/my-trades", {
        params: { limit: 10 },
      });
      const root = response?.data?.data ?? response?.data ?? {};
      setTrades(root.trades || []);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const totalProfit = trades
    .filter((t) => t.status === "settled")
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  const walletSummary = {
    deposits: 15000,
    withdrawals: 3000,
    profit: totalProfit,
    bonus: 250,
  };

  const handleDeposit = (e) => {
    e.preventDefault();
    const newBal = (user?.wallet || 0) + 5000;
    updateWallet(newBal);
    alert("Demo Deposit Successful! Added ₹5,000 to your wallet.");
  };

  const walletBalance = user?.wallet ? Number(user.wallet).toLocaleString("en-IN") : "0";

  return (
    <div>
      <header className="ot-header">
        <b>Wallet</b>
      </header>

      <div className="ot-container">
        {/* Balance Card */}
        <div className="ot-card">
          <div className="ot-sub">Available Balance</div>
          <div className="ot-balance">₹{walletBalance}.00</div>

          <div className="ot-actions">
            <a href="#" onClick={handleDeposit} className="ot-action-btn ot-deposit-btn">
              Deposit
            </a>
            <Link to="/withdraw" className="ot-action-btn ot-withdraw-btn">
              Withdraw
            </Link>
          </div>
        </div>

        {/* Summary Card */}
        <div className="ot-card">
          <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>Wallet Summary</h3>
          <p style={{ margin: "6px 0" }}>Total Deposits : ₹{walletSummary.deposits.toLocaleString("en-IN")}</p>
          <p style={{ margin: "6px 0" }}>Total Withdrawals : ₹{walletSummary.withdrawals.toLocaleString("en-IN")}</p>
          <p style={{ margin: "6px 0" }}>
            Total Profit :{" "}
            <span style={{ color: walletSummary.profit >= 0 ? "green" : "red", fontWeight: "bold" }}>
              {walletSummary.profit >= 0 ? "+" : ""}₹{walletSummary.profit.toFixed(0)}
            </span>
          </p>
          <p style={{ margin: "6px 0" }}>Bonus : ₹{walletSummary.bonus}</p>
        </div>

        {/* Recent Transactions list */}
        <div className="ot-history-card">
          <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>Recent Transactions</h3>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>Loading transactions...</div>
          ) : trades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>No transactions found.</div>
          ) : (
            trades.map((trade) => {
              const isSettled = trade.status === "settled";
              const isProfit = isSettled && Number(trade.pnl || 0) > 0;
              const isLoss = isSettled && Number(trade.pnl || 0) <= 0;

              const title = isSettled ? (isProfit ? "Trade Won" : "Trade Lost") : "Trade Placed";
              const amountClass = isProfit ? "ot-credit" : "ot-debit";
              const amountPrefix = isProfit ? "+" : "-";

              return (
                <div className="ot-item" key={trade.id}>
                  <div>
                    <b>{title}</b>
                    <br />
                    <small style={{ color: "#666", fontSize: "11px" }}>{trade.market?.question}</small>
                  </div>
                  <div className={isSettled ? amountClass : ""}>
                    {isSettled
                      ? `${amountPrefix}₹${Math.abs(trade.pnl).toFixed(0)}`
                      : `₹${trade.total_cost?.toFixed(0)}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default Wallet;
