import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import useMarkets from "../hooks/useMarkets";
import useAuth from "../hooks/useAuth";
import TradeModal from "../components/TradeModal";
import { formatINR, formatTimeLeft } from "../utils/formatters";

const Markets = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isListView = location.search.includes("view=list");

  const { markets, loading, category, setCategory, refresh } = useMarkets("live");
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [selectedSide, setSelectedSide] = useState("yes");
  const [modalOpen, setModalOpen] = useState(false);

  // Poll for live market updates every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const qMatch = m.question.toLowerCase().includes(search.trim().toLowerCase());
      const cMatch = category === "All" || m.category === category;
      return qMatch && cMatch;
    });
  }, [markets, search, category]);

  const handleTrade = (market, side) => {
    setSelectedMarket(market);
    setSelectedSide(side);
    setModalOpen(true);
  };

  const pointsBalance = user?.points_balance !== undefined ? Number(user.points_balance).toLocaleString("en-IN") : "0";

  if (isListView) {
    // -------------------------------------------------------------
    // RENDER: market-3.html (Markets List View)
    // -------------------------------------------------------------
    return (
      <div>
        <header className="ot-header">
          <b>Markets</b>
          <span>Balance {pointsBalance} pts</span>
        </header>

        {/* Scrolling Category Tabs */}
        <div className="ot-tabs">
          <div className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>All</div>
          <div className={category === "Crypto" ? "active" : ""} onClick={() => setCategory("Crypto")}>Crypto</div>
          <div className={category === "Forex" ? "active" : ""} onClick={() => setCategory("Forex")}>Forex</div>
          <div className={category === "Macro" ? "active" : ""} onClick={() => setCategory("Macro")}>Macro</div>
          <div className={category === "Stocks" ? "active" : ""} onClick={() => setCategory("Stocks")}>Stocks</div>
        </div>

        {/* Markets list */}
        <div className="ot-sec">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading markets...</div>
          ) : filteredMarkets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No active markets found.</div>
          ) : (
            filteredMarkets.map((market) => {
              const yesPrice = market.yes_price ?? 5;
              const noPrice = market.no_price ?? 5;
              return (
                <div className="ot-market" key={market.id}>
                  <span className="ot-badge">LIVE</span>
                  <h3>{market.question}</h3>
                  <p>{market.category} • Ends in {formatTimeLeft(market.end_time)}</p>
                  <div className="ot-row-flex">
                    <div className="ot-market-btn ot-yes-btn" onClick={() => handleTrade(market, "yes")}>
                      YES {yesPrice.toFixed(1)} pts
                    </div>
                    <div className="ot-market-btn ot-no-btn" onClick={() => handleTrade(market, "no")}>
                      NO {noPrice.toFixed(1)} pts
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>



        <TradeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          market={selectedMarket}
          initialSide={selectedSide}
          onSuccess={refresh}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: index-3.html (Home View)
  // -------------------------------------------------------------
  return (
    <div>
      <header className="ot-header">
        <div className="ot-logo">Tradexa</div>
        <div>{pointsBalance} pts</div>
      </header>

      {/* Search Input */}
      <div className="ot-search">
        <input
          placeholder="Search Markets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Scrolling Category Tabs */}
      <div className="ot-tabs">
        <div className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>All</div>
        <div className={category === "Crypto" ? "active" : ""} onClick={() => setCategory("Crypto")}>Crypto</div>
        <div className={category === "Forex" ? "active" : ""} onClick={() => setCategory("Forex")}>Forex</div>
        <div className={category === "Macro" ? "active" : ""} onClick={() => setCategory("Macro")}>Macro</div>
        <div className={category === "Stocks" ? "active" : ""} onClick={() => setCategory("Stocks")}>Stocks</div>
      </div>

      <div className="ot-wallet-card">
        <h3 style={{ margin: 0, fontWeight: "normal", fontSize: "14px", opacity: 0.9 }}>Points Balance</h3>
        <h1 style={{ margin: "5px 0 0", fontSize: "30px", fontWeight: "bold" }}>{pointsBalance} pts</h1>
      </div>

      {/* Markets Cards Grid */}
      <div style={{ paddingBottom: "10px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading markets...</div>
        ) : filteredMarkets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No active markets found.</div>
        ) : (
          filteredMarkets.map((market) => {
            const yesPrice = market.yes_price ?? 5;
            const noPrice = market.no_price ?? 5;
            const yesProb = Math.round((yesPrice / 10) * 100);
            const noProb = 100 - yesProb;

            return (
              <div className="ot-card" key={market.id}>
                <div className="ot-title">{market.question}</div>
                <div className="ot-info">
                  {market.category} • Ends in {formatTimeLeft(market.end_time)}
                </div>
                <div className="ot-odds">
                  <div className="ot-btn ot-blue" onClick={() => handleTrade(market, "yes")}>YES</div>
                  <div className="ot-btn ot-pink" onClick={() => handleTrade(market, "no")}>NO</div>
                  <div className="ot-btn ot-blue" onClick={() => handleTrade(market, "yes")}>{yesProb}%</div>
                  <div className="ot-btn ot-pink" onClick={() => handleTrade(market, "no")}>{noProb}%</div>
                  <div className="ot-btn ot-blue" onClick={() => handleTrade(market, "yes")}>BUY</div>
                  <div className="ot-btn ot-pink" onClick={() => handleTrade(market, "no")}>SELL</div>
                </div>
              </div>
            );
          })
        )}
      </div>



      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        market={selectedMarket}
        initialSide={selectedSide}
        onSuccess={refresh}
      />
    </div>
  );
};

export default Markets;
