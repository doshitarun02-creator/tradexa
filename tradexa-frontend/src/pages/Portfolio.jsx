import React, { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CircleDollarSign, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import client from "../api/client";
import Layout from "../components/Layout";
import useAuth from "../hooks/useAuth";
import { formatINR } from "../utils/formatters";

function formatCurrency(value) {
  return formatINR(value);
}

function getPolylinePoints(data, width, height, padding) {
  if (!data.length) return "";

  const values = data.map((item) => Number(item.pnl || 0));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  return data
    .map((item, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((Number(item.pnl || 0) - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function Portfolio() {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadPortfolio = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await client.get("/portfolio");
      if (response.data?.success) {
        setPortfolioData(response.data.data);
      } else {
        setError(response.data?.message || "Failed to load portfolio.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load portfolio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();

    // Re-fetch when a trade is placed from other pages
    const handleTradePlaced = () => loadPortfolio();
    window.addEventListener("trade:placed", handleTradePlaced);

    return () => {
      window.removeEventListener("trade:placed", handleTradePlaced);
    };
  }, []);

  const openPositions = useMemo(() => {
    if (!portfolioData?.open_positions) return [];
    return portfolioData.open_positions;
  }, [portfolioData]);

  const filteredPositions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return openPositions;

    return openPositions.filter((pos) => {
      const question = pos?.market?.question || "";
      const category = pos?.market?.category || "";
      const side = pos?.side || "";
      return [question, category, side].some((val) =>
        val.toLowerCase().includes(term)
      );
    });
  }, [openPositions, search]);

  const chartData = useMemo(() => {
    // Generate simple data points for SVG charting based on positions' P&L history
    const basePoints = openPositions.map((pos, idx) => ({
      label: `P${idx + 1}`,
      pnl: Number(pos.pnl || 0),
    }));
    if (basePoints.length === 0) {
      return [{ label: "Start", pnl: 0 }];
    }
    return basePoints.reverse().slice(0, 8); // Limit to last 8 positions
  }, [openPositions]);

  const chartPoints = useMemo(() => {
    return getPolylinePoints(chartData, 640, 220, 22);
  }, [chartData]);

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Metric Cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border bg-surface p-5 transition-all hover:border-primary/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Points balance</p>
                <h2 className="mt-1 text-xl font-bold font-mono text-slate-100">
                  {(portfolioData?.points_balance ?? user?.points_balance ?? 0).toLocaleString("en-IN")} pts
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 transition-all hover:border-sky-500/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Points deployed</p>
                <h2 className="mt-1 text-xl font-bold font-mono text-slate-100">
                  {(portfolioData?.total_points_invested ?? 0).toLocaleString("en-IN")} pts
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 transition-all hover:border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Net Settled Points P&amp;L</p>
                <h2
                  className={`mt-1 text-xl font-bold font-mono ${
                    (portfolioData?.total_points_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {(portfolioData?.total_points_pnl ?? 0).toLocaleString("en-IN")} pts
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 transition-all hover:border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Active positions</p>
                <h2 className="mt-1 text-xl font-bold font-mono text-slate-100">
                  {openPositions.length}
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Charts & Stats */}
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-100">Performance curve</h2>
              <p className="mt-1 text-xs text-slate-400">
                Open-position P&amp;L trend from your active book (up to 8 positions).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-slate-950/60 p-4">
              <svg viewBox="0 0 640 220" className="h-[220px] w-full">
                <defs>
                  <linearGradient id="portfolio-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#00d4aa" />
                  </linearGradient>
                </defs>

                <line x1="22" y1="190" x2="618" y2="190" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <line x1="22" y1="110" x2="618" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
                <line x1="22" y1="30" x2="618" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="4 6" />

                {chartPoints && openPositions.length > 0 ? (
                  <>
                    <polyline
                      fill="none"
                      stroke="url(#portfolio-line)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints}
                    />
                    {chartData.map((item, index) => {
                      const values = chartData.map((entry) => Number(entry.pnl || 0));
                      const min = Math.min(...values, 0);
                      const max = Math.max(...values, 0);
                      const range = max - min || 1;
                      const stepX = chartData.length > 1 ? (640 - 44) / (chartData.length - 1) : 0;
                      const x = 22 + index * stepX;
                      const y = 220 - 22 - ((Number(item.pnl || 0) - min) / range) * (220 - 44);

                      return (
                        <g key={index}>
                          <circle cx={x} cy={y} r="4" fill="#00d4aa" className="cursor-pointer hover:r-5 transition-all" />
                          <text x={x} y="212" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                            {item.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <text x="320" y="110" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="sans-serif">
                    No active positions to display
                  </text>
                )}
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-100">Trading stats</h2>
              <p className="mt-1 text-xs text-slate-400">
                Aggregated performance parameters from settled trades.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-slate-950/40 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">Win Rate</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-slate-100">
                    {portfolioData?.win_rate ?? 0}%
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${Number(portfolioData?.win_rate || 0) >= 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                  {Number(portfolioData?.win_rate || 0) >= 50 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-slate-950/40 p-4">
                  <p className="text-xs text-slate-400">Trades Won</p>
                  <p className="mt-2 text-xl font-bold font-mono text-emerald-400">
                    {portfolioData?.wins ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-slate-950/40 p-4">
                  <p className="text-xs text-slate-400">Trades Lost</p>
                  <p className="mt-2 text-xl font-bold font-mono text-red-400">
                    {portfolioData?.losses ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-slate-950/40 p-4 flex justify-between items-center">
                <span className="text-xs text-slate-400">Total volume traded</span>
                <span className="text-sm font-semibold font-mono text-slate-200">
                  {portfolioData?.total_trades ?? 0} trades
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Open Positions List */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-100">Open Positions</h2>
            <p className="mt-1 text-xs text-slate-400">
              Active positions currently open in your book.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-900/50" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              {error}
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-slate-950/40 p-8 text-center text-xs text-slate-400">
              No open positions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-slate-400 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Side</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Avg Price</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Unrealized P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPositions.map((pos) => {
                    const isYes = pos.side === "yes";
                    return (
                      <tr key={pos.id} className="hover:bg-slate-950/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {pos?.market?.icon} {pos?.market?.question || "Untitled position"}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{pos?.market?.category}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isYes ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{pos.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{formatCurrency(pos.price_per_share)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{formatCurrency(pos.total_cost)}</td>
                        <td className={`py-3 px-4 text-right font-mono font-semibold ${Number(pos.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(pos.pnl || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default Portfolio;
