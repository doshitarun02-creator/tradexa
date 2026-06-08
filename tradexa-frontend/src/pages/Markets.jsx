import React, { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import useMarkets from "../hooks/useMarkets";
import MarketCard from "../components/MarketCard";
import SkeletonCard from "../components/SkeletonCard";
import TradeModal from "../components/TradeModal";
import { formatINR } from "../utils/formatters";
import apiClient from "../api/client";

const CATEGORY_TABS = [
  { key: "All", label: "All" },
  { key: "Crypto", label: "₿ Crypto" },
  { key: "Forex", label: "💱 Forex" },
  { key: "Macro", label: "🌍 Macro" },
  { key: "Stocks", label: "📊 Stocks" },
  { key: "Commodities", label: "🥇 Commodities" },
];

const Markets = () => {
  const {
    markets,
    loading,
    category,
    setCategory,
    refresh,
  } = useMarkets("live");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [stats, setStats] = useState({ totalVolume: 0, liveCount: 0, tradersToday: 0 });
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [selectedSide, setSelectedSide] = useState("yes");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get("/admin/stats");
        if (res.data?.success) {
          setStats({
            totalVolume: res.data.data.total_volume || 0,
            liveCount: res.data.data.live_markets || 0,
            tradersToday: res.data.data.total_users || 0, // proxy until we have daily traders
          });
        }
      } catch {
        // silent
      }
    };
    fetchStats();
  }, []);

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      if (debounced && !m.question.toLowerCase().includes(debounced)) {
        return false;
      }
      if (category && category !== "All" && m.category !== category) {
        return false;
      }
      return true;
    });
  }, [markets, debounced, category]);

  const handleTrade = (market, side) => {
    setSelectedMarket(market);
    setSelectedSide(side);
    setModalOpen(true);
  };

  const handleTradeSuccess = () => {
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/40">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Live markets
            </div>
            <div className="text-sm text-slate-100">
              Trade your macro and crypto views in one terminal.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full bg-slate-900/70 border border-slate-700 px-2.5 py-1">
            {stats.liveCount} live markets
          </span>
          <span className="rounded-full bg-slate-900/70 border border-slate-700 px-2.5 py-1">
            {formatINR(stats.totalVolume)} total volume
          </span>
          <span className="rounded-full bg-slate-900/70 border border-slate-700 px-2.5 py-1">
            {stats.tradersToday} traders today
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`px-2.5 py-1.5 rounded-full border text-[11px] ${
                category === tab.key
                  ? "border-primary/80 bg-primary/10 text-primary"
                  : "border-border bg-slate-900/70 text-slate-300 hover:border-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64 relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search markets…"
            className="w-full rounded-lg bg-slate-950/70 border border-border pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mt-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      )}

      {!loading && filteredMarkets.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center text-center text-slate-400">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/40 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-sm font-medium text-slate-100 mb-1">No markets found</div>
          <div className="text-xs text-slate-500">
            Try adjusting filters or check back when new questions go live.
          </div>
        </div>
      )}

      {!loading && filteredMarkets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mt-2">
          {filteredMarkets.map((m) => (
            <MarketCard key={m.id} market={m} onTrade={handleTrade} />
          ))}
        </div>
      )}

      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        market={selectedMarket}
        initialSide={selectedSide}
        onSuccess={handleTradeSuccess}
      />
    </div>
  );
};

export default Markets;
