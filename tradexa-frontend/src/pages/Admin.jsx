import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Plus,
  RefreshCcw,
  Shield,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import client from "../api/client";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import Can from "../components/Can";
import usePermissions from "../hooks/usePermissions";
import { formatINR } from "../utils/formatters";

function SettlementConfirmModal({ market, outcome, open, loading, onClose, onConfirm }) {
  if (!open || !market) return null;
  const isYes = outcome === "yes";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-t-[28px] border border-border bg-[#08101b] p-5 sm:rounded-[28px] sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Confirm settlement</p>
              <h3 className="mt-2 text-lg font-bold text-slate-100">
                {isYes ? "YES Wins" : "NO Wins"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-slate-900 text-slate-400 transition hover:text-slate-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">This action will settle the market permanently.</p>
                <p className="mt-1.5 text-amber-100/80 leading-relaxed font-sans">{market.question}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-slate-900 px-4 text-xs font-semibold text-slate-200 transition hover:border-border-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-xs font-bold text-slate-950 transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Settling..." : `Confirm ${isYes ? "YES" : "NO"}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const TABS = [
  { key: "markets", label: "Markets Manager", icon: Landmark, perm: null },
  { key: "users", label: "Users", icon: Users, perm: "users:view" },
  { key: "stats", label: "Platform Stats", icon: BarChart3, perm: "stats:view" },
];

const INITIAL_MARKET_FORM = {
  question: "",
  category: "Crypto",
  icon: "📈",
  price_symbol: "",
  b: "100",
  end_time: "",
  status: "live",
};

function extractMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatCurrency(value) {
  return formatINR(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Admin() {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState("markets");
  const [search, setSearch] = useState("");

  const [markets, setMarkets] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);

  const [marketsLoading, setMarketsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [marketForm, setMarketForm] = useState(INITIAL_MARKET_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [settlingMarketId, setSettlingMarketId] = useState("");
  const [selectedOutcomeByMarket, setSelectedOutcomeByMarket] = useState({});
  const [confirmState, setConfirmState] = useState({ open: false, market: null, outcome: "" });

  const [walletAmountByUser, setWalletAmountByUser] = useState({});
  const [walletLoadingUserId, setWalletLoadingUserId] = useState("");

  const [toast, setToast] = useState(null);

  const filteredMarkets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return markets;

    return markets.filter((market) =>
      [market.question, market.category, market.status, market.winning_side]
        .some((val) => String(val || "").toLowerCase().includes(term))
    );
  }, [markets, search]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) =>
      [u.name, u.email, u.role]
        .some((val) => String(val || "").toLowerCase().includes(term))
    );
  }, [users, search]);

  const adminCards = useMemo(() => {
    return [
      {
        label: "Total Users",
        value: stats?.total_users ?? users.length,
        icon: Users,
        tone: "text-sky-300 bg-sky-500/10",
      },
      {
        label: "Total Markets",
        value: stats?.total_markets ?? markets.length,
        icon: Landmark,
        tone: "text-violet-300 bg-violet-500/10",
      },
      {
        label: "Total Trades",
        value: stats?.total_trades ?? 0,
        icon: Shield,
        tone: "text-amber-300 bg-amber-500/10",
      },
      {
        label: "Platform Balance",
        value: formatCurrency(stats?.total_wallet_balance ?? 0),
        icon: CircleDollarSign,
        tone: "text-emerald-300 bg-emerald-500/10",
      },
    ];
  }, [stats, users.length, markets.length]);

  const loadMarkets = async () => {
    setMarketsLoading(true);
    try {
      const response = await client.get("/markets");
      const data = response.data?.data || response.data || {};
      setMarkets(data.markets || []);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to load markets."),
      });
    } finally {
      setMarketsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await client.get("/admin/users");
      const data = response.data?.data || response.data || {};
      setUsers(data.users || []);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to load users."),
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await client.get("/admin/stats");
      const data = response.data?.data || response.data || {};
      setStats(data);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to load stats."),
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await client.get("/admin/market-templates");
      const data = response.data?.data || response.data || {};
      setTemplates(data.templates || []);
    } catch (error) {
      // ignore
    }
  };

  useEffect(() => {
    loadMarkets();
    loadUsers();
    loadStats();
    loadTemplates();
  }, []);

  const handleMarketInputChange = (event) => {
    const { name, value } = event.target;
    setMarketForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyTemplate = (tpl) => {
    setMarketForm((prev) => ({
      ...prev,
      question: tpl.question,
      category: tpl.category,
      icon: tpl.icon || "📈",
      price_symbol: tpl.price_symbol || "",
    }));
    setToast({
      type: "success",
      message: `Template applied: "${tpl.question.substring(0, 30)}..."`,
    });
  };

  const validateMarketForm = () => {
    if (marketForm.question.trim().length < 10) {
      return "Question must be at least 10 characters.";
    }
    if (marketForm.category.trim().length < 2) {
      return "Category must be at least 2 characters.";
    }
    if (!marketForm.icon.trim()) {
      return "Icon is required.";
    }
    const bValue = Number(marketForm.b);
    if (!Number.isFinite(bValue) || bValue <= 0) {
      return "Liquidity parameter (b) must be a positive number.";
    }
    if (!marketForm.end_time) {
      return "End time is required.";
    }
    const endTime = new Date(marketForm.end_time);
    if (Number.isNaN(endTime.getTime()) || endTime <= new Date()) {
      return "End time must be in the future.";
    }
    return "";
  };

  const handleCreateMarket = async (event) => {
    event.preventDefault();

    const validationError = validateMarketForm();
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    setCreateLoading(true);

    try {
      await client.post("/admin/markets", {
        question: marketForm.question.trim(),
        category: marketForm.category.trim(),
        icon: marketForm.icon.trim(),
        price_symbol: marketForm.price_symbol.trim(),
        b: Number(marketForm.b),
        end_time: new Date(marketForm.end_time).toISOString(),
        status: marketForm.status,
      });

      setMarketForm(INITIAL_MARKET_FORM);
      setToast({ type: "success", message: "Market created successfully." });
      await Promise.all([loadMarkets(), loadStats()]);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to create market."),
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const openSettlementConfirm = (market) => {
    const resolvedOutcome = selectedOutcomeByMarket[market.id];
    if (!resolvedOutcome) {
      setToast({ type: "error", message: "Select YES or NO before settlement." });
      return;
    }
    setConfirmState({ open: true, market, outcome: resolvedOutcome });
  };

  const closeSettlementConfirm = () => {
    if (settlingMarketId) return;
    setConfirmState({ open: false, market: null, outcome: "" });
  };

  const handleSettleMarket = async () => {
    const { market, outcome: resolvedOutcome } = confirmState;
    if (!market?.id || !resolvedOutcome) {
      setToast({ type: "error", message: "Invalid settlement request." });
      return;
    }

    setSettlingMarketId(market.id);

    try {
      const response = await client.post(`/admin/markets/${market.id}/settle`, {
        winning_side: resolvedOutcome,
      });

      const payload = response?.data?.data || {};
      const updatedMarket = payload.market;

      if (updatedMarket?.id) {
        setMarkets((prev) =>
          prev.map((item) => (item.id === updatedMarket.id ? { ...item, ...updatedMarket } : item))
        );
      }

      setToast({
        type: "success",
        message: `Market settled. ${resolvedOutcome.toUpperCase()} wins! Paid out: ${formatCurrency(payload.total_payout || 0)} across ${payload.settled_trades || 0} trades.`,
      });

      closeSettlementConfirm();
      await Promise.all([loadMarkets(), loadStats()]);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to settle market."),
      });
    } finally {
      setSettlingMarketId("");
    }
  };

  const handleWalletAdjust = async (userId, operation) => {
    const entry = walletAmountByUser[userId] || {};
    const amount = Number(entry.amount);
    const reason = (entry.reason || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setToast({ type: "error", message: "Enter a valid positive number." });
      return;
    }
    if (reason.length < 5) {
      setToast({ type: "error", message: "A reason (min 5 characters) is required." });
      return;
    }

    setWalletLoadingUserId(userId);

    try {
      await client.patch(`/admin/users/${userId}/wallet`, {
        amount,
        operation, // add | subtract
        reason,
      });
      setWalletAmountByUser((prev) => ({ ...prev, [userId]: { amount: "", reason: "" } }));
      setToast({ type: "success", message: `Wallet successfully modified.` });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      setToast({
        type: "error",
        message: extractMessage(error, "Failed to adjust user wallet."),
      });
    } finally {
      setWalletLoadingUserId("");
    }
  };

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Header Block */}
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-primary">TradeXa Control Room</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl">
                Platform Admin
              </h1>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Manage prediction markets, settle contracts, adjust wallets, and monitor platform volumes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                loadMarkets();
                loadUsers();
                loadStats();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-slate-950/40 px-3 py-2 text-xs text-slate-300 transition hover:text-primary"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Sync Platform Data
            </button>
          </div>
        </section>

        {/* Info Grid */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{card.label}</p>
                    <h2 className="mt-1 text-lg font-bold font-mono text-slate-100">{card.value}</h2>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Tab Pills */}
        <section className="rounded-3xl border border-border bg-surface p-2 flex flex-wrap gap-1">
          {TABS.filter((tab) => !tab.perm || hasPermission(tab.perm)).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-slate-400 hover:bg-slate-950/40 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </section>

        {/* TAB 1: MARKETS */}
        {activeTab === "markets" ? (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            {/* Create Market Form */}
            <Can
              perm="markets:create"
              fallback={
                <div className="rounded-3xl border border-border bg-surface p-5 h-fit flex flex-col items-center justify-center text-center gap-2 py-10">
                  <Shield className="h-6 w-6 text-slate-500" />
                  <p className="text-xs text-slate-400">
                    Your role does not have permission to create markets.
                  </p>
                </div>
              }
            >
              <div className="rounded-3xl border border-border bg-surface p-5 h-fit">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-100">Create New Market</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Instantiate an LMSR automated market maker.
                </p>
              </div>

              {/* templates */}
              {templates.length > 0 && (
                <div className="mb-5 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    Autofill from templates
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-slate-950/45 border border-border/60">
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="text-[10px] bg-slate-900 border border-border/60 px-2 py-1 rounded-lg text-slate-300 hover:border-primary/40 hover:text-primary transition-all text-left truncate max-w-full"
                      >
                        {tpl.category}: {tpl.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateMarket} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="question" className="text-xs font-medium text-slate-300">
                    Question
                  </label>
                  <textarea
                    id="question"
                    name="question"
                    rows="3"
                    value={marketForm.question}
                    onChange={handleMarketInputChange}
                    className="w-full rounded-2xl border border-border bg-slate-950/60 px-4 py-3 text-xs text-slate-200 outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/10"
                    placeholder="e.g. Will USD/INR settle above 86.50 by Friday?"
                  />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="category" className="text-xs font-medium text-slate-300">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={marketForm.category}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                    >
                      <option value="Crypto">Crypto</option>
                      <option value="Forex">Forex</option>
                      <option value="Macro">Macro</option>
                      <option value="Stocks">Stocks</option>
                      <option value="Commodities">Commodities</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="icon" className="text-xs font-medium text-slate-300">
                      Icon
                    </label>
                    <input
                      id="icon"
                      name="icon"
                      value={marketForm.icon}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                      placeholder="📊"
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="price_symbol" className="text-xs font-medium text-slate-300">
                      Price Feed Symbol
                    </label>
                    <input
                      id="price_symbol"
                      name="price_symbol"
                      value={marketForm.price_symbol}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                      placeholder="BTC/USD, USD/INR etc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="b" className="text-xs font-medium text-slate-300">
                      Liquidity (b)
                    </label>
                    <input
                      id="b"
                      name="b"
                      type="number"
                      min="1"
                      value={marketForm.b}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="end_time" className="text-xs font-medium text-slate-300">
                      Expiration Time
                    </label>
                    <input
                      id="end_time"
                      name="end_time"
                      type="datetime-local"
                      value={marketForm.end_time}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="status" className="text-xs font-medium text-slate-300">
                      Initial Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={marketForm.status}
                      onChange={handleMarketInputChange}
                      className="h-11 w-full rounded-2xl border border-border bg-slate-950/60 px-4 text-xs text-slate-200 outline-none transition focus:border-primary/50"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary text-xs font-bold text-slate-950 transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                >
                  <Plus className="h-4 w-4" />
                  {createLoading ? "Creating Market..." : "Create LMSR Market"}
                </button>
              </form>
            </div>
            </Can>

            {/* Markets List Manager */}
            <div className="rounded-3xl border border-border bg-surface p-5">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-100">Active Book &amp; Settlement</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select outcomes to resolve contracts. Payouts disperse automatically.
                </p>
              </div>

              {marketsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-900/40" />
                  ))}
                </div>
              ) : filteredMarkets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-slate-950/40 p-8 text-center text-xs text-slate-400">
                  No markets available.
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {filteredMarkets.map((market) => (
                    <div
                      key={market.id}
                      className="rounded-2xl border border-border bg-slate-950/30 p-4 hover:border-border-hover transition-all"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono tracking-wider text-slate-400">
                            <span className="text-primary">{market.category}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              market.status === "live" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                            }`}>{market.status}</span>
                          </div>
                          <h3 className="mt-2 text-sm font-semibold text-slate-200">
                            {market.icon} {market.question}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                            <span>YES: <b className="text-emerald-400">{formatCurrency(market.yes_price)}</b></span>
                            <span>NO: <b className="text-red-400">{formatCurrency(market.no_price)}</b></span>
                            <span>Vol: <b className="text-slate-200">{formatCurrency(market.volume)}</b></span>
                            <span>Ends: <b className="text-slate-300">{formatDateTime(market.end_time)}</b></span>
                          </div>
                        </div>

                        {market.status === "settled" ? (
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Settled: {String(market.winning_side || "—").toUpperCase()}
                          </div>
                        ) : (
                          <Can perm="markets:settle">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedOutcomeByMarket[market.id] || ""}
                                onChange={(event) =>
                                  setSelectedOutcomeByMarket((prev) => ({
                                    ...prev,
                                    [market.id]: event.target.value,
                                  }))
                                }
                                className="h-9 rounded-xl border border-border bg-slate-900 px-3 text-xs text-slate-200 outline-none transition focus:border-primary/40 cursor-pointer"
                              >
                                <option value="">Outcome</option>
                                <option value="yes">YES</option>
                                <option value="no">NO</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => openSettlementConfirm(market)}
                                disabled={settlingMarketId === market.id}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-slate-950 transition hover:bg-primary-strong disabled:opacity-50"
                              >
                                Resolve
                              </button>
                            </div>
                          </Can>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* TAB 2: USERS */}
        {activeTab === "users" ? (
          <section className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-100">Registered Traders</h2>
              <p className="mt-1 text-xs text-slate-400">
                View platform participants and manually execute balance adjustments.
              </p>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-900/40" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-slate-950/40 p-8 text-center text-xs text-slate-400">
                No users available.
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="grid gap-4 rounded-2xl border border-border bg-slate-950/30 p-4 md:grid-cols-[1.5fr_1fr_2fr]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{u.name || "Anonymous"}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400 font-mono">{u.email}</p>
                      <div className="mt-2.5 flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-slate-500">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${["super_admin", "ops_admin", "market_admin", "risk_admin"].includes(u.role) ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"}`}>{u.role}</span>
                        <span>•</span>
                        <span>Joined {formatDateTime(u.created_at)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Wallet balance</p>
                      <p className="mt-1.5 text-base font-bold font-mono text-primary">
                        {formatCurrency(u.wallet)}
                      </p>
                    </div>

                    <Can
                      perm="wallet:adjust"
                      fallback={
                        <div className="flex items-center justify-center text-[11px] text-slate-500 italic">
                          No wallet permission
                        </div>
                      }
                    >
                      <div className="flex flex-col gap-2 justify-center">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={walletAmountByUser[u.id]?.amount || ""}
                            onChange={(event) =>
                              setWalletAmountByUser((prev) => ({
                                ...prev,
                                [u.id]: { ...prev[u.id], amount: event.target.value },
                              }))
                            }
                            className="h-9 w-full rounded-xl border border-border bg-slate-900 px-3 text-xs text-slate-200 outline-none focus:border-primary/40"
                            placeholder="Amount"
                          />
                          <button
                            type="button"
                            onClick={() => handleWalletAdjust(u.id, "add")}
                            disabled={walletLoadingUserId === u.id}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-800 border border-border px-3 text-xs text-slate-200 hover:text-primary transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWalletAdjust(u.id, "subtract")}
                            disabled={walletLoadingUserId === u.id}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-slate-950 transition hover:bg-primary-strong disabled:opacity-50"
                          >
                            Subtract
                          </button>
                        </div>
                        <input
                          type="text"
                          value={walletAmountByUser[u.id]?.reason || ""}
                          onChange={(event) =>
                            setWalletAmountByUser((prev) => ({
                              ...prev,
                              [u.id]: { ...prev[u.id], reason: event.target.value },
                            }))
                          }
                          className="h-9 w-full rounded-xl border border-border bg-slate-900 px-3 text-xs text-slate-200 outline-none focus:border-primary/40"
                          placeholder="Reason (required, min 5 chars)"
                        />
                      </div>
                    </Can>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* TAB 3: STATS */}
        {activeTab === "stats" ? (
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-5">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-100">Live operational stats</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Real‑time indexes of platform utilization, user bases, and volumes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadStats}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-slate-950/40 px-3 text-xs text-slate-300 transition hover:text-primary"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Sync Metrics
                </button>
              </div>

              {statsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-900/40" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-slate-950/30 p-5">
                    <p className="text-xs text-slate-400">User accounts</p>
                    <h3 className="mt-3 text-2xl font-bold font-mono text-slate-200">
                      {stats?.total_users ?? 0}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-5">
                    <p className="text-xs text-slate-400">Active Live Markets</p>
                    <h3 className="mt-3 text-2xl font-bold font-mono text-slate-200">
                      {stats?.live_markets ?? 0}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-5">
                    <p className="text-xs text-slate-400">Total volume traded</p>
                    <h3 className="mt-3 text-2xl font-bold font-mono text-primary">
                      {formatCurrency(stats?.total_volume ?? 0)}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-5">
                    <p className="text-xs text-slate-400">Escrow Balance</p>
                    <h3 className="mt-3 text-2xl font-bold font-mono text-slate-200">
                      {formatCurrency(stats?.total_wallet_balance ?? 0)}
                    </h3>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Markets Breakdown</h3>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-border bg-slate-950/30 p-4 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total created markets</span>
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {stats?.total_markets ?? 0}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-4 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Settled markets</span>
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {stats?.settled_markets ?? 0}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-4 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Upcoming markets</span>
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {stats?.upcoming_markets ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Trades Breakdown</h3>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-border bg-slate-950/30 p-4 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total fills count</span>
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {stats?.total_trades ?? 0}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-slate-950/30 p-4 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Average volume per user</span>
                    <span className="text-sm font-bold font-mono text-primary">
                      {formatCurrency(
                        (stats?.total_users || 1)
                          ? (stats?.total_volume || 0) / (stats?.total_users || 1)
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <SettlementConfirmModal
        open={confirmState.open}
        market={confirmState.market}
        outcome={confirmState.outcome}
        loading={Boolean(settlingMarketId)}
        onClose={closeSettlementConfirm}
        onConfirm={handleSettleMarket}
      />

      <Toast
        open={Boolean(toast)}
        type={toast?.type}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </Layout>
  );
}
