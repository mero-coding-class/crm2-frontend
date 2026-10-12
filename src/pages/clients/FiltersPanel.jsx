import React from "react";
import { Search, Calendar, ChevronDown, X, RotateCcw } from "lucide-react";

export default function FiltersPanel({
  searchQuery,
  setSearchQuery,
  searchLastPaymentDate,
  setSearchLastPaymentDate,
  filterPaymentNotCompleted,
  setFilterPaymentNotCompleted,
  filterScheduledTaken,
  setFilterScheduledTaken,
  onClear,
  loading,
}) {
  const hasActiveFilters = Boolean(
    searchQuery ||
    searchLastPaymentDate ||
    filterPaymentNotCompleted ||
    filterScheduledTaken
  );

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[240px] max-w-sm flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school, principal, email, phone..."
            className="w-full pl-9 pr-8 py-1.5 text-[13px] bg-white border border-slate-200 rounded-[8px] placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Last Payment Date */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-[8px] px-2.5 py-1.5 text-[13px] shadow-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-[12px] font-[500] text-slate-500 shrink-0">Pay Date:</span>
          <input
            type="date"
            value={searchLastPaymentDate}
            onChange={(e) => setSearchLastPaymentDate(e.target.value)}
            className="text-[12px] text-slate-700 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
          />
          {searchLastPaymentDate && (
            <button
              onClick={() => setSearchLastPaymentDate("")}
              className="text-slate-400 hover:text-slate-600 ml-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Demo Taken Filter */}
        <div className="relative">
          <select
            value={filterScheduledTaken}
            onChange={(e) => setFilterScheduledTaken(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-[13px] bg-white border border-slate-200 rounded-[8px] text-slate-700 font-[500] focus:outline-none focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] cursor-pointer shadow-xs"
          >
            <option value="">Demo Taken: All</option>
            <option value="Yes">Demo: Yes</option>
            <option value="No">Demo: No</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Payment Pending Toggle */}
        <label
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[13px] font-[500] border cursor-pointer select-none transition-colors shadow-xs ${
            filterPaymentNotCompleted
              ? "bg-amber-50 text-amber-800 border-amber-300"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <input
            type="checkbox"
            checked={filterPaymentNotCompleted}
            onChange={(e) => setFilterPaymentNotCompleted(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-[#E8A026] focus:ring-[#E8A026] cursor-pointer"
          />
          <span>Payment Pending</span>
        </label>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-[500] text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-[6px] border border-rose-200 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
