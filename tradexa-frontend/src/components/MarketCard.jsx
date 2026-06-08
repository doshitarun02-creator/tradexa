import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatINR, formatTimeLeft } from "../utils/formatters";
import usePrices from "../hooks/usePrices";

const getSentiment = (yesPrice) => {
  const yesProb = (yesPrice / 10) * 100;
  if (yesProb > 60) return { label: "🐂 Bullish", color: "text-emerald-400 bg-emerald-500/10" };
  if (yesProb < 40) return { label: "🐻 Bearish", color: "text-red-400 bg-red-500/10" };
  return { label: "⚖️ Neutral", color: "text-slate-300 bg-slate-700/40" };
};

const MarketCard = ({ market, onTrade }) => {
  const { getPriceForSymbol } = usePrices();
  const navigate = useNavigate();

  const yesPrice = market.yes_price ?? 5;
  const noPrice = market.no_price ?? 5;
  const yesProb = Math.round((yesPrice / 10) * 100);
  const noProb = 100 - yesProb;

  const sentiment = getSentiment(yesPrice);
  const timeLeftLabel = formatTimeLeft(market.end_time);
  const timeLeftMs = new Date(market.end_time).getTime() - Date.now();
  const timeLeftHours = timeLeftMs / (1000 * 60 * 60);

  const timeColor =
    timeLeftLabel === "Ended"
      ? "text-red-400"
      : timeLeftHours <= 1
      ? "text-red-400"
      : timeLeftHours <= 24
      ? "text-gold"
      : "text-slate-400";

  const livePriceChip = useMemo(() => {
    if (!market.price_symbol) return null;

    const symbol = market.price_symbol;
    let priceData = null;

    if (symbol.includes("BTC")) priceData = getPriceForSymbol("BTC");
    else if (symbol.includes("ETH")) priceData = getPriceForSymbol("ETH");
    else if (symbol.includes("USD/INR")) priceData = getPriceForSymbol("USD/INR");
    else if (symbol.includes("EUR/USD")) priceData = getPriceForSymbol("EUR/USD");

    if (!priceData) return null;

    if (priceData.type === "crypto") {
      const { inr, change24h } = priceData;
      const sign = change24h > 0 ? "▲" : change24h < 0 ? "▼" : "";
      const changeClass =
        change24h > 0 ? "text-emerald-300" : change24h < 0 ? "text-red-300" : "text-slate-200";
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 border border-gold/50 text-[11px] font-mono text-gold">
          {symbol}{" "}
          <span className="text-slate-100">
            {inr ? `₹${inr.toLocaleString("en-IN")}` : "—"}
          </span>
          {sign && (
            <span className={changeClass}>
              {sign}
              {Math.abs(change24h).toFixed(1)}%
            </span>
          )}
        </span>
      );
    }

    if (priceData.type === "forex") {
      const { value } = priceData;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 border border-gold/50 text-[11px] font-mono text-gold">
          {symbol} <span className="text-slate-100">{value ? value.toFixed(4) : "—"}</span>
        </span>
      );
    }

    return null;
  }, [market.price_symbol, getPriceForSymbol]);

  const onYes = (e) => {
    e.stopPropagation();
    onTrade?.(market, "yes");
  };
  const onNo = (e) => {
    e.stopPropagation();
    onTrade?.(market, "no");
  };

  return (
    <div
      onClick={() => navigate(`/markets/${market.id}`)}
      className="group rounded-xl border border-border bg-surface/80 shadow-soft-lg transition-transform duration-150 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_18px_45px_rgba(0,0,0,0.75)] cursor-pointer"
    >
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-lg">
              {market.icon || "📊"}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{market.category}</span>
              </div>
              <div className={`text-[11px] ${timeColor}`}>{timeLeftLabel}</div>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-slate-700/80 ${sentiment.color}`}
          >
            {sentiment.label}
          </span>
        </div>

        <div className="text-sm font-medium text-slate-50 line-clamp-2">
          {market.question}
        </div>

        {livePriceChip && <div className="pt-1">{livePriceChip}</div>}

        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>YES {yesProb}%</span>
            <span>NO {noProb}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden flex">
            <div
              className="h-full bg-yes/80"
              style={{ width: `${yesProb}%` }}
            />
            <div
              className="h-full bg-no/80"
              style={{ width: `${noProb}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span>📊 {formatINR(market.volume || 0)} vol</span>
          <span>👥 {market.traders || 0} traders</span>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-yes/90 hover:bg-yes text-slate-950 text-xs font-semibold py-2 transition-colors"
          >
            YES ₹{yesPrice.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-no/90 hover:bg-no text-slate-50 text-xs font-semibold py-2 transition-colors"
          >
            NO ₹{noPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketCard;
