import React from "react";
import { RotateCcw, Search, X } from "lucide-react";

export default function FiltersPanel({
  searchQuery,
  setSearchQuery,
  onClear,
  loading,
  academicUsers = [],
  assignedTo = "",
  onAcademicFilterChange,
}) {
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
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-[8px] placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
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

        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="whitespace-nowrap">Academic assignee</span>
          <select
            value={assignedTo}
            onChange={(event) => onAcademicFilterChange?.(event.target.value)}
            disabled={loading}
            className="h-9 min-w-40 rounded-[8px] border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="">All academic users</option>
            {academicUsers.map((academicUser) => (
              <option key={academicUser.id} value={academicUser.id}>{academicUser.name}</option>
            ))}
          </select>
        </label>

        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-[6px] border border-rose-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Clear Search
          </button>
        )}
      </div>
    </div>
  );
}
