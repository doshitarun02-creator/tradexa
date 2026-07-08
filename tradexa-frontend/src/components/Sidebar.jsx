import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart2,
  Briefcase,
  Newspaper,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";
import usePrices from "../hooks/usePrices";
import { formatChange, formatINR } from "../utils/formatters";

const navItems = [
  { to: "/markets", label: "Markets", icon: BarChart2 },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/news", label: "News", icon: Newspaper },
];

const Sidebar = ({ isMobile = false }) => {
  const { user } = useAuth();
  const { isAnyAdmin } = usePermissions();
  const { getPriceForSymbol } = usePrices();
  const location = useLocation();

  const btc = getPriceForSymbol("BTC");
  const eth = getPriceForSymbol("ETH");
  const usdInr = getPriceForSymbol("USD/INR");

  const containerClasses = isMobile
    ? "flex items-center justify-between px-3 py-2 gap-1"
    : "flex flex-col h-full px-3 py-4 gap-4";

  return (
    <aside className={containerClasses}>
      {!isMobile && (
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/50">
            <div className="h-4 w-4 rounded-sm bg-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
              TradeXa
            </div>
            <div className="text-sm font-semibold text-slate-55">
              Opinion Terminal
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="mt-2 rounded-xl border border-border bg-slate-950/60 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Portfolio value</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              Live
            </span>
          </div>
          <div className="text-lg font-semibold font-mono text-slate-50">
            {formatINR(user?.wallet || 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            Cash wallet · P&L from settled YES bets is already included.
          </div>
        </div>
      )}

      {isMobile ? (
        <nav className="flex-1 flex items-center justify-between gap-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl ${
                  isActive ? "text-primary" : "text-slate-400"
                }`}
              >
                <Icon className={`h-4 w-4 mb-0.5 ${isActive ? "stroke-[2.2]" : ""}`} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
          {isAnyAdmin && (
            <NavLink
              to="/admin"
              className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl ${
                location.pathname.startsWith("/admin") ? "text-primary" : "text-slate-400"
              }`}
            >
              <ShieldCheck className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">Admin</span>
            </NavLink>
          )}
        </nav>
      ) : (
        <>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${
                      isActive
                        ? "bg-slate-900/80 text-primary"
                        : "text-slate-300 hover:bg-slate-900/40 hover:text-slate-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? "text-primary" : "text-slate-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            {isAnyAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-slate-900/80 text-primary"
                      : "text-slate-300 hover:bg-slate-900/40 hover:text-slate-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck
                      className={`h-4 w-4 ${
                        isActive ? "text-primary" : "text-slate-400"
                      }`}
                    />
                    <span>Admin</span>
                  </>
                )}
              </NavLink>
            )}
          </nav>

          <div className="mt-auto w-full border-t border-border pt-3 space-y-1 text-xs">
            <div className="text-[11px] text-slate-500 mb-1">Live prices</div>
            {btc && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">BTC</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div
                    className={`text-[10px] ${
                      btc.change24h > 0 ? "text-emerald-400" : btc.change24h < 0 ? "text-red-400" : "text-slate-400"
                    }`}
                  >
                    {formatChange(btc.change24h)}
                  </div>
                </div>
              </div>
            )}
            {eth && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">ETH</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div
                    className={`text-[10px] ${
                      eth.change24h > 0 ? "text-emerald-400" : eth.change24h < 0 ? "text-red-400" : "text-slate-400"
                    }`}
                  >
                    {formatChange(eth.change24h)}
                  </div>
                </div>
              </div>
            )}
            {usdInr && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">USD/INR</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500">Spot</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
