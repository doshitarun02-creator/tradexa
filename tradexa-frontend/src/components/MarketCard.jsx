import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatINR, formatTimeLeft } from "../utils/formatters";
import usePrices from "../hooks/usePrices";

const getSentiment = (yesPrice) => {
  const yesProb = (yesPrice / 10) * 100;
  if (yesProb > 60) return { label: "🐂 Bullish", color: "text-green-600 bg-green-50" };
  if (yesProb < 40) return { label: "🐻 Bearish", color: "text-red-600 bg-red-50" };
  return { label: "⚖️ Neutral", color: "text-slate-600 bg-slate-100" };
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
      ? "text-red-500"
      : timeLeftHours <= 1
      ? "text-red-500"
      : timeLeftHours <= 24
      ? "text-amber-600 font-medium"
      : "text-slate-500";

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
        change24h > 0 ? "text-green-600" : change24h < 0 ? "text-red-600" : "text-slate-500";
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-250 text-[11px] font-mono text-amber-700">
          {symbol}{" "}
          <span className="text-slate-800 font-semibold">
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-250 text-[11px] font-mono text-amber-700">
          {symbol} <span className="text-slate-800 font-semibold">{value ? value.toFixed(4) : "—"}</span>
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
      className="rounded-[10px] border border-slate-200 bg-surface shadow-[0_2px_4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-primary/30 transition-all duration-150 cursor-pointer"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
              {market.icon || "📊"}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e53935] text-[10px] text-white font-bold uppercase select-none">
                <span>LIVE</span>
              </div>
              <div className={`text-[11px] ${timeColor}`}>{timeLeftLabel}</div>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-slate-200 ${sentiment.color}`}
          >
            {sentiment.label}
          </span>
        </div>

        <div className="text-[15px] font-bold text-slate-800 line-clamp-2">
          {market.question}
        </div>

        {livePriceChip && <div className="pt-0.5">{livePriceChip}</div>}

        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-semibold">
            <span>YES {yesProb}%</span>
            <span>NO {noProb}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-yes"
              style={{ width: `${yesProb}%` }}
            />
            <div
              className="h-full bg-no"
              style={{ width: `${noProb}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
          <span>📊 {formatINR(market.volume || 0)} vol</span>
          <span>👥 {market.traders || 0} traders</span>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 inline-flex items-center justify-center rounded-[8px] bg-yes hover:bg-yes/80 text-slate-800 text-xs font-bold py-2.5 transition-colors border border-primary/10"
          >
            YES {yesPrice.toFixed(1)} pts
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 inline-flex items-center justify-center rounded-[8px] bg-no hover:bg-no/80 text-slate-800 text-xs font-bold py-2.5 transition-colors border border-primary/10"
          >
            NO {noPrice.toFixed(1)} pts
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketCard;
