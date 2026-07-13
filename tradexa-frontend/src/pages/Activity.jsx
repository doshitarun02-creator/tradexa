import React, { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import client from "../api/client";
import { formatINR } from "../utils/formatters";

const Activity = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrades = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/my-trades", {
        params: { limit: 100 },
      });
      const root = res?.data?.data ?? res?.data ?? {};
      setTrades(root.trades || []);
    } catch (err) {
      setError("Failed to load trade log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const totalTrades = trades.length;
  const wonTrades = trades.filter((t) => t.status === "settled" && Number(t.pnl || 0) > 0).length;
  const lostTrades = trades.filter((t) => t.status === "settled" && Number(t.pnl || 0) <= 0).length;

  return (
    <div>
      <header className="ot-header">
        <b>Trade History</b>
      </header>

      <div className="ot-wrap" style={{ paddingBottom: "20px" }}>
        {/* Statistics boxes */}
        <div className="ot-summary-grid">
          <div className="ot-summary-box">
            <b>Total</b>
            <h2>{totalTrades}</h2>
          </div>
          <div className="ot-summary-box">
            <b>Won</b>
            <h2 className="ot-win-text">{wonTrades}</h2>
          </div>
          <div className="ot-summary-box">
            <b>Lost</b>
            <h2 className="ot-loss-text">{lostTrades}</h2>
          </div>
        </div>

        {/* List of cards */}
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading history...</div>
          ) : error ? (
            <div style={{ color: "red", padding: "10px", textAlign: "center" }}>{error}</div>
          ) : trades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No trades placed yet.</div>
          ) : (
            trades.map((trade) => {
              const isSettled = trade.status === "settled";
              const isWin = isSettled && Number(trade.pnl || 0) > 0;
              const isLoss = isSettled && Number(trade.pnl || 0) <= 0;
              
              const pnlText = isSettled
                ? (isWin ? `+₹${trade.pnl.toFixed(0)}` : `-₹${Math.abs(trade.pnl).toFixed(0)}`)
                : "PENDING";
              const pnlClass = isSettled
                ? (isWin ? "ot-win-text" : "ot-loss-text")
                : "";

              return (
                <div className="ot-card" key={trade.id}>
                  <div className="ot-row">
                    <b>{trade?.market?.question || "Untitled Market"}</b>
                    <span className={pnlClass}>{pnlText}</span>
                  </div>
                  <small style={{ display: "block", color: "#666", marginTop: "6px", fontSize: "12px" }}>
                    Prediction: {trade.side?.toUpperCase()} • {trade.status?.toUpperCase()} • {new Date(trade.created_at).toLocaleDateString()}
                  </small>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default Activity;
