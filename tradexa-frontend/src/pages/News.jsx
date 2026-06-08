import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe, MessageSquare, Newspaper, RefreshCcw } from "lucide-react";
import client from "../api/client";
import Layout from "../components/Layout";

function getSentimentBadge(sentiment) {
  if (sentiment === "positive") {
    return {
      label: "🐂 Bullish",
      class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    };
  }
  if (sentiment === "negative") {
    return {
      label: "🐻 Bearish",
      class: "bg-red-500/10 text-red-400 border border-red-500/20",
    };
  }
  return {
    label: "⚖️ Neutral",
    class: "bg-slate-800 text-slate-400 border border-slate-700/50",
  };
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [error, setError] = useState("");

  const loadNews = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await client.get("/news");
      const data = response.data?.data || response.data || {};
      setArticles(data.articles || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        article.title?.toLowerCase().includes(term) ||
        article.description?.toLowerCase().includes(term) ||
        article.source?.toLowerCase().includes(term);

      const matchSentiment = !sentimentFilter || article.sentiment === sentimentFilter;

      return matchSearch && matchSentiment;
    });
  }, [articles, search, sentimentFilter]);

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Header Block */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">Market News Feed</h1>
              <p className="mt-2 text-xs text-slate-400">
                Curated financial intelligence with derived entity sentiment tracking.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-slate-950/40 px-3 py-2 text-xs text-slate-400 font-mono">
                <span>Filter Sentiment:</span>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">All</option>
                  <option value="positive" className="bg-slate-900">🐂 Bullish</option>
                  <option value="negative" className="bg-slate-900">🐻 Bearish</option>
                  <option value="neutral" className="bg-slate-900">⚖️ Neutral</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadNews}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-slate-950/40 px-3 text-xs text-slate-300 transition hover:text-primary disabled:opacity-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Content Section */}
        {loading ? (
          <section className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-2xl bg-surface/50 border border-border" />
            ))}
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </section>
        ) : filteredArticles.length === 0 ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <Newspaper className="h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-base font-bold text-slate-200">No articles match criteria</h2>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Clear your query or search something else to display news bulletins.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article, index) => {
              const badge = getSentimentBadge(article.sentiment);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="rounded-3xl border border-border bg-surface p-5 flex flex-col justify-between hover:border-border-hover transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
                        <Globe className="h-3 w-3 text-slate-500" />
                        {article.source || "External Source"}
                      </span>
                      {badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${badge.class}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group mt-3 block"
                    >
                      <h3 className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                        {article.title}
                      </h3>
                    </a>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {article.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/40 pt-3 text-[10px] text-slate-500 font-mono">
                    <span>{formatDate(article.published_at)}</span>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-strong transition-colors"
                    >
                      Read full article
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </section>
        )}
      </div>
    </Layout>
  );
}

export default News;
