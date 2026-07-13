import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const CollapsibleSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: "/markets", label: "Home", icon: "🏠", exact: true },
    { to: "/markets?view=list", label: "Markets", icon: "📈" },
    { to: "/wallet", label: "Points", icon: "💼" },
    { to: "/activity", label: "History", icon: "📜" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div
      className={`h-screen bg-white border-r border-[#ddd] flex flex-col justify-between transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
      style={{ fontFamily: "Arial, sans-serif", zIndex: 100, flexShrink: 0 }}
    >
      <div>
        {/* Brand / Toggle */}
        <div className="p-4 border-b border-[#eee] flex items-center justify-between">
          {!collapsed && (
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#0b6fa4" }}>
              Tradexa
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px",
              marginLeft: collapsed ? "auto" : "0",
              outline: "none"
            }}
          >
            {collapsed ? "➡️" : "⬅️"}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col p-2 gap-1">
          {navItems.map((item) => {
            const currentFull = location.pathname + location.search;
            const isActive = item.exact
              ? location.pathname === "/markets" && !location.search
              : currentFull === item.to ||
                (item.to === "/markets?view=list" && location.pathname.startsWith("/markets") && location.pathname !== "/markets") ||
                (item.to === "/wallet" && location.pathname.startsWith("/redeem"));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 p-3 rounded-lg text-decoration-none transition-colors ${
                  isActive
                    ? "bg-[#0b6fa4]/10 text-[#0b6fa4] font-bold"
                    : "text-[#333] hover:bg-[#f5f5f5]"
                }`}
                style={{ fontSize: "15px", textDecoration: "none" }}
              >
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 text-xs text-[#999] border-t border-[#eee] text-center">
          © Tradexa 2026
        </div>
      )}
    </div>
  );
};

export default CollapsibleSidebar;
