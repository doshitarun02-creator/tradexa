import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, BarChart2, Users, CalendarClock } from "lucide-react";
import apiClient from "../api/client";
import { formatINR, formatTimeLeft, formatTimeAgo } from "../utils/formatters";
import SkeletonCard from "../components/SkeletonCard";
import TradeModal from "../components/TradeModal";
import usePrices from "../hooks/usePrices";
import useAuth from "../hooks/useAuth";

const MarketDetail = () => {
  const { id } = useParams();
  const { getPriceForSymbol } = usePrices();
  const { user } = useAuth();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [selectedSide, setSelectedSide] = useState("yes");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchMarket = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/markets/${id}`);
        if (res.data?.success) {
          setMarket(res.data.data.market);
        }
      } catch {
        // ignore for now
      } finally {
        setLoading(false);
      }
    };

    const fetchTrades = async () => {
      try {
        const res = await apiClient.get("/my-trades", { params: { limit: 10 } });
        if (res.data?.success) {
          const filtered = res.data.data.trades.filter(
            (t) => t.market && t.market.id === id
          );
          setTrades(filtered);
        }
      } catch {
        // ignore
      }
    };

    fetchMarket();
    fetchTrades();
  }, [id]);

  const livePrice = useMemo(() => {
    if (!market?.price_symbol) return null;
    const symbol = market.price_symbol;
    let data = null;

    if (symbol.includes("BTC")) data = getPriceForSymbol("BTC");
    else if (symbol.includes("ETH")) data = getPriceForSymbol("ETH");
    else if (symbol.includes("USD/INR")) data = getPriceForSymbol("USD/INR");
    else if (symbol.includes("EUR/USD")) data = getPriceForSymbol("EUR/USD");

    return data;
  }, [market, getPriceForSymbol]);

  const yesPrice = market?.yes_price ?? 5;
  const noPrice = market?.no_price ?? 5;
  const yesProb = Math.round((yesPrice / 10) * 100);
  const noProb = 100 - yesProb;

  const openTrade = (side) => {
    setSelectedSide(side);
    setModalOpen(true);
  };

  const handleTradeSuccess = () => {
    // simple refetch
    apiClient
      .get(`/markets/${id}`)
      .then((res) => {
        if (res.data?.success) setMarket(res.data.data.market);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-sm text-slate-400">
        Market not found.
      </div>
    );
  }

  const pointsBalance = user?.points_balance !== undefined ? Number(user.points_balance).toLocaleString("en-IN") : "0";

  return (
    <div>
      <header className="ot-header">
        <b>Market Detail</b>
        <span>Balance {pointsBalance} pts</span>
      </header>

      <div className="ot-wrap" style={{ paddingBottom: "80px" }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            background: "none",
            border: "none",
            color: "#0b6fa4",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "12px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: 0
          }}
        >
          ← Back to markets
        </button>

        <div className="ot-card" style={{ margin: 0, marginBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
            <div style={{ fontSize: "28px" }}>
              {market.icon || "📊"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span className="ot-badge">LIVE</span>
                <span style={{ fontSize: "12px", color: "#666" }}>
                  Ends in {formatTimeLeft(market.end_time)}
                </span>
              </div>
              <h3 style={{ margin: "4px 0", fontSize: "18px", fontWeight: "bold", color: "#222" }}>
                {market.question}
              </h3>
              <p style={{ margin: "4px 0", color: "#666", fontSize: "13px" }}>
                Category: {market.category} • Volume: {formatINR(market.volume || 0)}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666", marginBottom: "4px", fontWeight: "bold" }}>
              <span>YES {yesProb}%</span>
              <span>NO {noProb}%</span>
            </div>
            <div style={{ height: "8px", borderRadius: "10px", background: "#eee", overflow: "hidden", display: "flex" }}>
              <div className="ot-yes-btn" style={{ width: `${yesProb}%`, height: "100%" }} />
              <div className="ot-no-btn" style={{ width: `${noProb}%`, height: "100%" }} />
            </div>
          </div>

          <div className="ot-odds" style={{ marginTop: "15px" }}>
            <div className="ot-btn ot-blue" onClick={() => openTrade("yes")}>YES</div>
            <div className="ot-btn ot-pink" onClick={() => openTrade("no")}>NO</div>
            <div className="ot-btn ot-blue" onClick={() => openTrade("yes")}>{yesProb}%</div>
            <div className="ot-btn ot-pink" onClick={() => openTrade("no")}>{noProb}%</div>
            <div className="ot-btn ot-blue" onClick={() => openTrade("yes")}>BUY</div>
            <div className="ot-btn ot-pink" onClick={() => openTrade("no")}>SELL</div>
          </div>
        </div>

        <div className="ot-card" style={{ margin: 0 }}>
          <h3 style={{ margin: "0 0 10px", borderBottom: "1px solid #eee", paddingBottom: "6px", fontSize: "16px" }}>Recent Trades</h3>
          {trades.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#666", padding: "10px 0" }}>No recent trades yet.</div>
          ) : (
            <div>
              {trades.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "13px", borderBottom: "1px solid #eee" }}>
                  <span>
                    Bought <b>{t.quantity}</b> {t.side.toUpperCase()} at <b>{t.price_per_share} pts</b>
                  </span>
                  <span style={{ color: "#888" }}>{formatTimeAgo(t.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        market={market}
        initialSide={selectedSide}
        onSuccess={handleTradeSuccess}
      />
    </div>
  );
};

export default MarketDetail;
