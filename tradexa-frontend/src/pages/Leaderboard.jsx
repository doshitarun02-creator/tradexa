import React, { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy, Users } from "lucide-react";
import client from "../api/client";
import Layout from "../components/Layout";
import { formatINR } from "../utils/formatters";

function extractLeaderboard(payload) {
  const root = payload?.data ?? payload ?? {};
  return root.leaderboard || root.users || [];
}

function formatValue(value) {
  return formatINR(value);
}

function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await client.get("/leaderboard");
        if (!mounted) return;

        const extracted = extractLeaderboard(response.data).map((item, index) => ({
          id: item.id || item.email || `leader-${index + 1}`,
          rank: Number(item.rank || index + 1),
          name: item.name || `Trader ${index + 1}`,
          metric: Number(item.wallet || 0),
          winRate: item.win_rate || 0,
          wins: item.wins || 0,
          losses: item.losses || 0,
          totalTrades: item.total_trades || 0,
          secondary: `${item.win_rate ?? 0}% Win Rate (${item.wins ?? 0}W - ${item.losses ?? 0}L, ${item.total_trades ?? 0} trades)`,
        }));

        setRows(extracted);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load leaderboard."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [row.name, row.secondary].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [rows, search]);

  const topThree = useMemo(() => {
    // Return first three entries or pad if fewer
    return filteredRows.slice(0, 3);
  }, [filteredRows]);

  const getIcon = (rank) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-300" />;
    if (rank === 2) return <Trophy className="h-5 w-5 text-slate-300" />;
    return <Medal className="h-5 w-5 text-orange-400" />;
  };

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Header Section */}
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">Leaderboard</h1>
              <p className="mt-2 text-xs text-slate-400">
                Top performers, capital leaders, and platform‑wide ranking signals.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-slate-950/40 px-4 py-2.5 text-xs text-slate-400 font-mono">
              <Users className="h-3.5 w-3.5 text-primary" />
              {filteredRows.length} ranked traders
            </div>
          </div>
        </section>

        {/* Top Three Podium Podium Cards */}
        {topThree.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            {topThree.map((row) => (
              <div
                key={row.id}
                className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
                  row.rank === 1
                    ? "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-surface"
                    : row.rank === 2
                    ? "border-slate-400/30 bg-gradient-to-b from-slate-400/5 to-surface"
                    : "border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/50`}>
                    {getIcon(row.rank)}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-400">#{row.rank}</span>
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-100 truncate">{row.name}</h2>
                <p className="mt-1 text-xs text-slate-400 font-mono truncate">{row.secondary}</p>
                <p className="mt-5 text-2xl font-bold font-mono text-primary">{formatValue(row.metric)}</p>
              </div>
            ))}
          </section>
        )}

        {/* Full Ranking Table */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-100">Full Ranking</h2>
            <p className="mt-1 text-xs text-slate-400">
              Ordered by current wallet balance.
            </p>
          </div>

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
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-slate-950/40 p-8 text-center text-xs text-slate-400">
              No entries found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="hidden grid-cols-[80px_1.5fr_2fr_180px] gap-4 bg-slate-950/60 px-5 py-3.5 text-[10px] uppercase tracking-wider font-mono text-slate-400 md:grid border-b border-border">
                <span>Rank</span>
                <span>Trader</span>
                <span>Context</span>
                <span className="text-right">Balance</span>
              </div>

              <div className="divide-y divide-border/60">
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-2 px-4 py-3.5 md:grid-cols-[80px_1.5fr_2fr_180px] md:items-center md:px-5 hover:bg-slate-950/20 transition-colors"
                  >
                    <div className="text-sm font-bold font-mono text-slate-300 md:text-base">#{row.rank}</div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{row.name}</p>
                    </div>

                    <div className="text-xs text-slate-400 font-mono truncate">{row.secondary}</div>

                    <div className="text-sm font-bold font-mono text-primary md:text-right">
                      {formatValue(row.metric)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default Leaderboard;
