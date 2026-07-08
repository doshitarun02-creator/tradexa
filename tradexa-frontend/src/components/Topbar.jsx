import React from "react";
import { Search, Wallet, ChevronDown } from "lucide-react";
import useAuth from "../hooks/useAuth";
import usePrices from "../hooks/usePrices";
import { formatChange, formatINR } from "../utils/formatters";

const Topbar = () => {
  const { user, logout } = useAuth();
  const { getPriceForSymbol } = usePrices();

  const btc = getPriceForSymbol("BTC");
  const eth = getPriceForSymbol("ETH");
  const usdInr = getPriceForSymbol("USD/INR");
  const eurUsd = getPriceForSymbol("EUR/USD");

  return (
    <header className="h-14 border-b border-border bg-surface/95 backdrop-blur-sm flex items-center px-3 md:px-6 gap-3 sticky top-0 z-20">
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search markets (BTC, USD/INR, Fed, NIFTY…) "
            className="w-full rounded-lg bg-slate-950/60 border border-border pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
        </div>
      </div>

      <div className="flex-1 md:flex-[1.5] overflow-hidden">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface via-surface/80 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface via-surface/80 to-transparent pointer-events-none" />
          <div className="flex whitespace-nowrap animate-marquee text-[11px] font-mono text-slate-200 gap-8">
            <div className="flex items-center gap-8">
              {btc && (
                <span>
                  BTC{" "}
                  <span className="text-slate-100">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      btc.change24h > 0
                        ? "text-emerald-400"
                        : btc.change24h < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }
                  >
                    ({formatChange(btc.change24h)})
                  </span>
                </span>
              )}
              {eth && (
                <span>
                  ETH{" "}
                  <span className="text-slate-100">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      eth.change24h > 0
                        ? "text-emerald-400"
                        : eth.change24h < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }
                  >
                    ({formatChange(eth.change24h)})
                  </span>
                </span>
              )}
              {usdInr && (
                <span>
                  USD/INR{" "}
                  <span className="text-slate-100">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </span>
                </span>
              )}
              {eurUsd && (
                <span>
                  EUR/USD{" "}
                  <span className="text-slate-100">
                    {eurUsd.value ? eurUsd.value.toFixed(4) : "—"}
                  </span>
                </span>
              )}
              <span>
                Gold{" "}
                <span className="text-gold">
                  ₹—{/* hook up once commodity prices exist */}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-8">
              {/* duplicate for seamless marquee */}
              {btc && (
                <span>
                  BTC{" "}
                  <span className="text-slate-100">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      btc.change24h > 0
                        ? "text-emerald-400"
                        : btc.change24h < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }
                  >
                    ({formatChange(btc.change24h)})
                  </span>
                </span>
              )}
              {eth && (
                <span>
                  ETH{" "}
                  <span className="text-slate-100">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      eth.change24h > 0
                        ? "text-emerald-400"
                        : eth.change24h < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }
                  >
                    ({formatChange(eth.change24h)})
                  </span>
                </span>
              )}
              {usdInr && (
                <span>
                  USD/INR{" "}
                  <span className="text-slate-100">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </span>
                </span>
              )}
              {eurUsd && (
                <span>
                  EUR/USD{" "}
                  <span className="text-slate-100">
                    {eurUsd.value ? eurUsd.value.toFixed(4) : "—"}
                  </span>
                </span>
              )}
              <span>
                Gold{" "}
                <span className="text-gold">
                  ₹—{/* again placeholder */}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-2">
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-slate-950/60 px-2.5 py-1.5">
            <Wallet className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] text-slate-300">Wallet</span>
            <span className="text-xs font-semibold text-gold font-mono">
              {formatINR(user?.wallet || 0)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="hidden sm:inline-flex text-[11px] text-slate-400 hover:text-slate-100 px-2 py-1 rounded-md border border-border"
        >
          Logout
        </button>

        <div className="flex items-center gap-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-border flex items-center justify-center text-[10px] font-medium">
            {user?.name?.[0]?.toUpperCase() || "T"}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs text-slate-100 leading-tight">
              {user?.name || "Trader"}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {["super_admin", "ops_admin", "market_admin", "risk_admin"].includes(user?.role) ? "Admin" : "Retail"}
            </span>
          </div>
          <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-500" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
