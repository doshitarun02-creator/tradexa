export const formatINR = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0 pts";
  const num = Number(value);
  return `${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })} pts`;
};

export const formatChange = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0%";
  const fixed = Number(value).toFixed(2);
  const sign = Number(value) > 0 ? "+" : "";
  return `${sign}${fixed}%`;
};

export const formatTimeLeft = (iso) => {
  if (!iso) return "—";
  const end = new Date(iso);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export const formatTimeAgo = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};
