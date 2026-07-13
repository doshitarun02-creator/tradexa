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
    <header className="h-14 border-b border-primary/20 bg-primary text-white flex items-center px-3 md:px-6 gap-3 sticky top-0 z-20">
      <div className="flex items-center gap-2 mr-2">
        <span className="text-base md:text-xl font-bold tracking-tight text-white select-none">
          Tradexa
        </span>
      </div>

      <div className="hidden md:flex items-center flex-1 max-w-xs">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 text-white/70 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search markets..."
            className="w-full rounded-lg bg-white/10 border border-white/20 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
        </div>
      </div>

      <div className="flex-1 md:flex-[1.5] overflow-hidden">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-primary via-primary/70 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-primary via-primary/70 to-transparent pointer-events-none" />
          <div className="flex whitespace-nowrap animate-marquee text-[10px] font-mono text-white/90 gap-8">
            <div className="flex items-center gap-8">
              {btc && (
                <span>
                  BTC{" "}
                  <span className="text-white font-semibold">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      btc.change24h > 0
                        ? "text-green-300"
                        : btc.change24h < 0
                        ? "text-red-300"
                        : "text-white/70"
                    }
                  >
                    ({formatChange(btc.change24h)})
                  </span>
                </span>
              )}
              {eth && (
                <span>
                  ETH{" "}
                  <span className="text-white font-semibold">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      eth.change24h > 0
                        ? "text-green-300"
                        : eth.change24h < 0
                        ? "text-red-300"
                        : "text-white/70"
                    }
                  >
                    ({formatChange(eth.change24h)})
                  </span>
                </span>
              )}
              {usdInr && (
                <span>
                  USD/INR{" "}
                  <span className="text-white font-semibold">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-8">
              {/* duplicate for seamless marquee */}
              {btc && (
                <span>
                  BTC{" "}
                  <span className="text-white font-semibold">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      btc.change24h > 0
                        ? "text-green-300"
                        : btc.change24h < 0
                        ? "text-red-300"
                        : "text-white/70"
                    }
                  >
                    ({formatChange(btc.change24h)})
                  </span>
                </span>
              )}
              {eth && (
                <span>
                  ETH{" "}
                  <span className="text-white font-semibold">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </span>{" "}
                  <span
                    className={
                      eth.change24h > 0
                        ? "text-green-300"
                        : eth.change24h < 0
                        ? "text-red-300"
                        : "text-white/70"
                    }
                  >
                    ({formatChange(eth.change24h)})
                  </span>
                </span>
              )}
              {usdInr && (
                <span>
                  USD/INR{" "}
                  <span className="text-white font-semibold">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1">
            <span className="text-[10px] text-white/80 hidden sm:inline">Balance</span>
            <span className="text-xs font-bold text-white font-mono">
              {formatINR(user?.wallet || 0)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="hidden sm:inline-flex text-[10px] text-white/80 hover:text-white px-2 py-1 rounded-md border border-white/20 bg-white/5"
        >
          Logout
        </button>

        <div className="flex items-center gap-1.5">
          <div className="h-7 w-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || "T"}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs text-white leading-tight font-medium">
              {user?.name || "Trader"}
            </span>
            <span className="text-[9px] text-white/70 leading-tight">
              {["super_admin", "ops_admin", "market_admin", "risk_admin"].includes(user?.role) ? "Admin" : "Retail"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
