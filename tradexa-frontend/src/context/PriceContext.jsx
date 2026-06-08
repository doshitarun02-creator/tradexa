import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

export const PriceContext = createContext(null);

export const PriceProvider = ({ children }) => {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/prices");
      if (res.data?.success) {
        setPrices(res.data.data);
      }
    } catch (err) {
      // ignore for now, UI can show skeletons
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getPriceForSymbol = useCallback(
    (symbol) => {
      if (!prices) return null;

      // crypto: BTC, ETH etc.
      if (symbol === "BTC" || symbol === "ETH") {
        const coin = prices.crypto?.[symbol];
        if (!coin) return null;
        return {
          label: symbol,
          inr: coin.inr,
          usd: coin.usd,
          change24h: coin.change_24h,
          type: "crypto",
        };
      }

      if (symbol === "USD/INR" || symbol === "EUR/USD" || symbol === "GBP/USD" || symbol === "JPY/USD") {
        const pair = prices.forex?.[symbol];
        if (!pair) return null;
        return {
          label: symbol,
          value: pair.rate,
          type: "forex",
        };
      }

      if (symbol === "GOLD") {
        // For now, approximate from crypto block or extend when commodities endpoint is added
        return null;
      }

      return null;
    },
    [prices]
  );

  const value = useMemo(
    () => ({
      prices,
      loading,
      getPriceForSymbol,
    }),
    [prices, loading, getPriceForSymbol]
  );

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
};
