import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BarChart2,
  Briefcase,
  Activity,
  User,
  ShieldCheck,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";
import usePrices from "../hooks/usePrices";
import { formatChange, formatINR } from "../utils/formatters";

const navItems = [
  { to: "/markets", label: "Home", icon: Home, exact: true },
  { to: "/markets?view=list", label: "Markets", icon: BarChart2 },
  { to: "/wallet", label: "Points", icon: Briefcase },
  { to: "/activity", label: "History", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
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
            <div className="text-sm font-semibold text-slate-50">
              Opinion Terminal
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="mt-2 rounded-xl border border-border bg-slate-50 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Portfolio value</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Live
            </span>
          </div>
          <div className="text-lg font-semibold font-mono text-slate-800">
            {formatINR(user?.points_balance || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Points balance · P&L from settled YES bets is already included.
          </div>
        </div>
      )}

      {isMobile ? (
        <nav className="flex-1 flex items-center justify-between gap-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            // Precise active matching
            const currentFull = location.pathname + location.search;
            const isActive = item.exact
              ? location.pathname === "/markets" && !location.search
              : currentFull === item.to ||
                (item.to === "/markets?view=list" && location.pathname.startsWith("/markets") && location.pathname !== "/markets") ||
                (item.to === "/wallet" && location.pathname.startsWith("/redeem"));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl ${
                  isActive ? "text-primary font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 mb-0.5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                <span className="text-[9px]">{item.label}</span>
              </NavLink>
            );
          })}
          {isAnyAdmin && (
            <NavLink
              to="/admin"
              className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl ${
                location.pathname.startsWith("/admin") ? "text-primary font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5 mb-0.5" />
              <span className="text-[9px]">Admin</span>
            </NavLink>
          )}
        </nav>
      ) : (
        <>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              // Precise active matching
              const currentFull = location.pathname + location.search;
              const isActive = item.exact
                ? location.pathname === "/markets" && !location.search
                : currentFull === item.to ||
                  (item.to === "/markets?view=list" && location.pathname.startsWith("/markets") && location.pathname !== "/markets") ||
                  (item.to === "/wallet" && location.pathname.startsWith("/redeem"));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-primary" : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            {isAnyAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
            <div className="text-[11px] text-slate-400 mb-1">Live prices</div>
            {btc && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">BTC</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-700 font-semibold">
                    {btc.inr ? `₹${btc.inr.toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div
                    className={`text-[10px] ${
                      btc.change24h > 0 ? "text-green-600 font-medium" : btc.change24h < 0 ? "text-red-650 font-medium" : "text-slate-400"
                    }`}
                  >
                    {formatChange(btc.change24h)}
                  </div>
                </div>
              </div>
            )}
            {eth && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">ETH</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-700 font-semibold">
                    {eth.inr ? `₹${eth.inr.toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div
                    className={`text-[10px] ${
                      eth.change24h > 0 ? "text-green-600 font-medium" : eth.change24h < 0 ? "text-red-650 font-medium" : "text-slate-400"
                    }`}
                  >
                    {formatChange(eth.change24h)}
                  </div>
                </div>
              </div>
            )}
            {usdInr && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">USD/INR</span>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-700 font-semibold">
                    {usdInr.value ? usdInr.value.toFixed(2) : "—"}
                  </div>
                  <div className="text-[10px] text-slate-400">Spot</div>
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
