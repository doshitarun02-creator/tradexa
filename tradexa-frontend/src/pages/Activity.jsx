import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, History } from "lucide-react";
import client from "../api/client";
import Layout from "../components/Layout";
import { formatINR } from "../utils/formatters";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Open Only", value: "open" },
  { label: "Settled Only", value: "settled" },
];

function formatCurrency(value) {
  return formatINR(value);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function Activity() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    page_size: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrades = async (page = 1, nextStatus = status) => {
    setLoading(true);
    setError("");

    try {
      const response = await client.get("/my-trades", {
        params: {
          page,
          limit: 10,
          ...(nextStatus ? { status: nextStatus } : {}),
        },
      });

      const root = response?.data?.data ?? response?.data ?? {};
      const total = root.total ?? 0;
      const limit = root.limit ?? 10;
      const pages = Math.ceil(total / limit) || 1;

      setTrades(root.trades || []);
      setPagination({
        page: root.page ?? page,
        pages,
        total,
        page_size: limit,
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to fetch activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades(1, status);
  }, [status]);

  useEffect(() => {
    const handleTradePlaced = () => loadTrades(1, status);
    window.addEventListener("trade:placed", handleTradePlaced);
    return () => window.removeEventListener("trade:placed", handleTradePlaced);
  }, [status]);

  const filteredTrades = trades.filter((trade) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const values = [
      trade?.market?.question,
      trade?.market?.category,
      trade?.side,
      trade?.status,
    ];

    return values.some((val) => String(val || "").toLowerCase().includes(term));
  });

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Header Options */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">Activity Log</h1>
              <p className="mt-2 text-xs text-slate-400">
                Full chronological trade history with side filters and pagination.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-slate-950/40 px-3 py-2 text-xs text-slate-400 font-mono">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value} className="bg-slate-900 text-slate-200">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-border bg-slate-950/40 px-4 py-2 text-xs text-slate-400 font-mono">
                {pagination.total} trades total
              </div>
            </div>
          </div>
        </section>

        {/* Trade Grid */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-900/50" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              {error}
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-950/30 px-6 py-14 text-center">
              <History className="h-9 w-9 text-slate-500" />
              <h2 className="mt-4 text-base font-bold text-slate-200">No activity found</h2>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Change your filters or place a trade in live markets to see history here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => {
                const isYes = trade.side === "yes";
                const isSettled = trade.status === "settled";
                return (
                  <div
                    key={trade.id}
                    className="grid gap-3 rounded-2xl border border-border/80 bg-slate-950/30 p-4 md:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))_1.2fr] hover:border-border transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-mono tracking-wider text-primary">
                        {trade?.market?.category || "Category"}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-semibold text-slate-100">
                        {trade?.market?.question || "Untitled market"}
                      </h3>
                      <p className="mt-1.5 text-[10px] font-mono text-slate-500">
                        {formatDate(trade.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Side</p>
                      <p className={`mt-1.5 text-xs font-bold uppercase tracking-wider ${isYes ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.side}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Quantity</p>
                      <p className="mt-1.5 text-xs font-bold font-mono text-slate-200">
                        {trade.quantity}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Avg Price</p>
                      <p className="mt-1.5 text-xs font-semibold font-mono text-slate-200">
                        {formatCurrency(trade.price_per_share)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Total Cost</p>
                      <p className="mt-1.5 text-xs font-semibold font-mono text-slate-200">
                        {formatCurrency(trade.total_cost)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">P&amp;L</p>
                      <p className={`mt-1.5 text-xs font-bold font-mono ${Number(trade.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(trade.pnl || 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Status</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isSettled ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300"
                      }`}>
                        {trade.status || "open"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => loadTrades(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-slate-950/40 px-3 text-xs text-slate-300 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <div className="text-xs font-mono text-slate-400">
              Page {pagination.page} of {pagination.pages || 1}
            </div>

            <button
              type="button"
              onClick={() => loadTrades(Math.min(pagination.pages || 1, pagination.page + 1))}
              disabled={pagination.page >= (pagination.pages || 1) || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-slate-950/40 px-3 text-xs text-slate-300 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default Activity;
