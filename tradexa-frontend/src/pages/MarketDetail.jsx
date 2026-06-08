import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, BarChart2, Users, CalendarClock } from "lucide-react";
import apiClient from "../api/client";
import { formatINR, formatTimeLeft, formatTimeAgo } from "../utils/formatters";
import SkeletonCard from "../components/SkeletonCard";
import TradeModal from "../components/TradeModal";
import usePrices from "../hooks/usePrices";

const MarketDetail = () => {
  const { id } = useParams();
  const { getPriceForSymbol } = usePrices();
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

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to markets
      </button>

      <div className="rounded-xl border border-border bg-surface/80 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-2xl">
            {market.icon || "📊"}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{market.category}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Ends in {formatTimeLeft(market.end_time)}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-50 mb-1">
              {market.question}
            </h1>
            {livePrice && (
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 border border-gold/50 px-3 py-1 text-[11px] font-mono text-gold mt-1">
                <span>{market.price_symbol}</span>
                {livePrice.type === "crypto" && (
                  <>
                    <span className="text-slate-100">
                      {livePrice.inr
                        ? `₹${livePrice.inr.toLocaleString("en-IN")}`
                        : "—"}
                    </span>
                  </>
                )}
                {livePrice.type === "forex" && (
                  <span className="text-slate-100">
                    {livePrice.value ? livePrice.value.toFixed(4) : "—"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>YES {yesProb}%</span>
            <span>NO {noProb}%</span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-900 overflow-hidden flex">
            <div
              className="h-full bg-yes/90"
              style={{ width: `${yesProb}%` }}
            />
            <div
              className="h-full bg-no/90"
              style={{ width: `${noProb}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-[11px]">
          <div className="rounded-lg bg-slate-950/70 border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <BarChart2 className="h-3 w-3" />
              <span>Volume</span>
            </div>
            <div className="text-slate-100 font-mono text-xs">
              {formatINR(market.volume || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Users className="h-3 w-3" />
              <span>Traders</span>
            </div>
            <div className="text-slate-100 font-mono text-xs">
              {market.traders || 0}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <CalendarClock className="h-3 w-3" />
              <span>End time</span>
            </div>
            <div className="text-slate-100 font-mono text-[11px]">
              {new Date(market.end_time).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <span>Status</span>
            </div>
            <div className="text-slate-100 font-mono text-xs capitalize">
              {market.status}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => openTrade("yes")}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-yes/90 hover:bg-yes text-slate-950 text-sm font-semibold py-2.5 transition-colors"
          >
            Buy YES ₹{yesPrice.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => openTrade("no")}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-no/90 hover:bg-no text-slate-50 text-sm font-semibold py-2.5 transition-colors"
          >
            Buy NO ₹{noPrice.toFixed(2)}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Recent trades</h2>
          <span className="text-[11px] text-slate-500">
            Last {trades.length} fills on this market
          </span>
        </div>
        {trades.length === 0 ? (
          <div className="text-xs text-slate-500">
            No recent trades yet. Be the first to take a view.
          </div>
        ) : (
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            {trades.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>
                  Trader bought{" "}
                  <span className="font-mono text-slate-100">{t.quantity}</span>{" "}
                  {t.side.toUpperCase()} shares at{" "}
                  <span className="font-mono text-slate-100">
                    {formatINR(t.price_per_share)}
                  </span>
                </span>
                <span className="text-slate-500">
                  {formatTimeAgo(t.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
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
