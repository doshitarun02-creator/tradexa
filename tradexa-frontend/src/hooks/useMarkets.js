import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

export const MARKET_CATEGORIES = ["All", "Crypto", "Forex", "Macro", "Stocks", "Commodities"];

const useMarkets = (initialStatus = "live") => {
  const [markets, setMarkets] = useState([]);
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);

  const fetchMarkets = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const params = {};
        const cat = overrides.category ?? category;
        const stat = overrides.status ?? status;

        if (cat && cat !== "All") params.category = cat;
        if (stat) params.status = stat;

        const res = await apiClient.get("/markets", { params });
        if (res.data?.success) {
          setMarkets(res.data.data.markets || []);
        }
      } catch (err) {
        // surface via toast later
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [category, status]
  );

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const filteredMarkets = useMemo(() => markets, [markets]);

  const refresh = useCallback(() => fetchMarkets(), [fetchMarkets]);

  return {
    markets: filteredMarkets,
    loading,
    category,
    status,
    setCategory,
    setStatus,
    refresh,
  };
};

export default useMarkets;
