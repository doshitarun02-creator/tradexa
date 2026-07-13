import React from "react";
import { Link } from "react-router-dom";

const BottomNav = ({ active }) => {
  const items = [
    { key: "home", label: "Home", icon: "🏠", path: "/portfolio" },
    { key: "markets", label: "Markets", icon: "📈", path: "/markets" },
    { key: "points", label: "Points", icon: "💎", path: "/wallet" },
    { key: "history", label: "History", icon: "📜", path: "/my-trades" },
    { key: "profile", label: "Profile", icon: "👤", path: "/profile" },
  ];

  return (
    <nav className="ot-bottom-nav">
      {items.map((item) => (
        <Link
          key={item.key}
          to={item.path}
          className={`ot-bottom-nav-item ${active === item.key ? "ot-bottom-nav-active" : ""}`}
        >
          <span className="ot-bottom-nav-icon">{item.icon}</span>
          <span className="ot-bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
