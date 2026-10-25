import React from "react";
import { RotateCcw, Search, X } from "lucide-react";

export default function FiltersPanel({ searchQuery, setSearchQuery, onClear, loading }) {
  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] max-w-sm flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search school, system ID, principal, or contact name..."
            className="w-full pl-9 pr-8 py-1.5 text-[13px] bg-white border border-slate-200 rounded-[8px] placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-[500] text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-[6px] border border-rose-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Clear Search
          </button>
        )}
      </div>
    </div>
  );
}
