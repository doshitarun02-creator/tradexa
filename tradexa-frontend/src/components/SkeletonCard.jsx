import React from "react";

const SkeletonCard = () => {
  return (
    <div className="rounded-xl border border-border bg-surface/80 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      <div className="relative p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="h-2.5 w-32 bg-slate-800 rounded-md" />
            <div className="h-2 w-24 bg-slate-900 rounded-md" />
          </div>
          <div className="h-7 w-20 rounded-full bg-slate-900" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-16 rounded-md bg-slate-900" />
          <div className="h-8 w-16 rounded-md bg-slate-900" />
          <div className="ml-auto h-2.5 w-16 bg-slate-900 rounded-md" />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <div className="h-2 w-20 bg-slate-900 rounded-md" />
          <div className="h-2 w-12 bg-slate-900 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
