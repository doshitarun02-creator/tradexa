import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import usePrices from "../hooks/usePrices";
import useAuth from "../hooks/useAuth";
import apiClient from "../api/client";
import { formatChange, formatINR } from "../utils/formatters";

const quickChips = [5, 10, 25, 50, 100];

const TradeModal = ({ open, onClose, market, initialSide = "yes", onSuccess }) => {
  const { getPriceForSymbol } = usePrices();
  const { updateWallet } = useAuth();

  const [side, setSide] = useState(initialSide);
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSide(initialSide);
      setError("");
    }
  }, [open, initialSide]);

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

  const pricePerShare = useMemo(() => {
    const raw = side === "yes" ? market?.yes_price : market?.no_price;
    return Number(raw || 0);
  }, [market, side]);

  const totalCost = useMemo(() => {
    return pricePerShare * Number(quantity || 0);
  }, [pricePerShare, quantity]);

  const profitIfWin = useMemo(() => {
    const payoff = 10 * Number(quantity || 0);
    return payoff - totalCost;
  }, [quantity, totalCost]);

  const lossIfLose = useMemo(() => {
    return totalCost;
  }, [totalCost]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleConfirm = async () => {
    if (!market) return;
    setError("");
    if (!quantity || Number(quantity) < 1) {
      setError("Quantity must be at least 1 share.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/trades", {
        market_id: market.id,
        side,
        quantity: Number(quantity),
      });

      if (res.data?.success) {
        const { new_wallet_balance } = res.data.data;
        if (typeof new_wallet_balance === "number") {
          updateWallet(new_wallet_balance);
        }
        onSuccess?.(res.data.data);
        onClose?.();
      } else {
        setError(res.data?.message || "Failed to place trade.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to place trade. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!market) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={handleBackdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg mx-auto rounded-t-2xl bg-surface border-t border-border shadow-2xl p-4 sm:p-5 space-y-3"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-lg">
                  {market.icon || "📊"}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{market.category}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-50 line-clamp-2">
                    {market.question}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {livePrice && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 px-3 py-2.5">
                <div className="text-[11px] text-slate-400 mb-0.5">Live reference</div>
                {livePrice.type === "crypto" && (
                  <div className="text-xs text-slate-50 font-mono">
                    {market.price_symbol} is currently{" "}
                    <span className="text-gold">
                      {livePrice.inr ? `₹${livePrice.inr.toLocaleString("en-IN")}` : "—"}
                    </span>{" "}
                    <span
                      className={
                        livePrice.change24h > 0
                          ? "text-emerald-400"
                          : livePrice.change24h < 0
                          ? "text-red-400"
                          : "text-slate-300"
                      }
                    >
                      ({formatChange(livePrice.change24h)} today)
                    </span>
                  </div>
                )}
                {livePrice.type === "forex" && (
                  <div className="text-xs text-slate-50 font-mono">
                    {market.price_symbol} is currently{" "}
                    <span className="text-gold">
                      {livePrice.value ? livePrice.value.toFixed(4) : "—"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center rounded-lg bg-slate-950/70 border border-border text-[11px] p-1.5">
              <button
                type="button"
                onClick={() => setSide("yes")}
                className={`flex-1 py-1.5 rounded-md font-semibold ${
                  side === "yes"
                    ? "bg-yes text-slate-950"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                YES ₹{(market.yes_price ?? 5).toFixed(2)}
              </button>
              <button
                type="button"
                onClick={() => setSide("no")}
                className={`flex-1 py-1.5 rounded-md font-semibold ${
                  side === "no"
                    ? "bg-no text-slate-50"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                NO ₹{(market.no_price ?? 5).toFixed(2)}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label>Quantity</label>
                <span className="text-[11px] text-slate-500">Number of shares</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 rounded-lg bg-slate-950/70 border border-border px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/60"
                />
                <div className="flex gap-1 flex-wrap justify-end">
                  {quickChips.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 hover:border-primary/60 hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-slate-950/80 px-3 py-3 text-[12px] font-mono text-slate-100 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Price per share</span>
                <span>{formatINR(pricePerShare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity</span>
                <span>{Number(quantity || 0)} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total cost</span>
                <span>{formatINR(totalCost)}</span>
              </div>
              <div className="border-t border-slate-800 my-1.5" />
              <div className="flex justify-between text-emerald-400">
                <span>If YES wins</span>
                <span>+{formatINR(profitIfWin)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>If NO wins</span>
                <span>-{formatINR(lossIfLose)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-400">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5" />
              <p>Opinion trading involves financial risk. Trade responsibly.</p>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-teal-300 text-slate-950 text-sm font-semibold py-2.5 shadow-lg hover:shadow-primary/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Placing trade…" : `Confirm ${side.toUpperCase()} trade`}
              </button>
              {error && (
                <div className="text-[11px] text-red-400 mt-0.5">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TradeModal;
