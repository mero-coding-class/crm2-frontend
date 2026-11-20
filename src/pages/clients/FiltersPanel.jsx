import React from "react";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

export default function FiltersPanel({
  showFilters,
  setShowFilters,
  searchQuery,
  setSearchQuery,
  loading,
  leadOwners = [],
  leadOwner = "",
  onLeadOwnerChange,
  academicAssignees = [],
  academicAssignee = "",
  onAcademicAssigneeChange,
  packages = [],
  packageType = "",
  onPackageChange,
  filters = {},
  onFilterChange,
  onClearFilters,
  filterOptionsError = "",
}) {
  const advancedFilterCount = [
    filters.owner,
    filters.package_type,
    filters.mou_start_from,
    filters.mou_start_to,
    filters.mou_end_from,
    filters.mou_end_to,
    filters.renewals,
    filters.assigned_to,
    filters.enrolled_from,
    filters.enrolled_to,
    filters.converted_from,
    filters.converted_to,
    filters.contract_from,
    filters.contract_to,
  ].filter(Boolean).length;

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-60 max-w-sm flex-1 sm:flex-initial">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search school, system ID, principal, or contact..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
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
        <button
          type="button"
          onClick={() => setShowFilters((visible) => !visible)}
          aria-expanded={showFilters}
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${showFilters ? "border-primary/30 bg-primary-light text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {advancedFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
              {advancedFilterCount}
            </span>
          )}
        </button>
        {advancedFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearFilters}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-medium text-slate-600">
            Lead Owner
            <select
              value={leadOwner}
              onChange={(event) => onLeadOwnerChange?.(event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            >
              <option value="">All lead owners</option>
              {leadOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Academic Assignee
            <select
              value={academicAssignee}
              onChange={(event) => onAcademicAssigneeChange?.(event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            >
              <option value="">All academic assignees</option>
              {academicAssignees.map((academic) => (
                <option key={academic.id} value={academic.id}>{academic.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Package
            <select
              value={packageType}
              onChange={(event) => onPackageChange?.(event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            >
              <option value="">All packages</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            MOU Start From
            <input
              type="date"
              value={filters.mou_start_from || ""}
              onChange={(event) => onFilterChange?.("mou_start_from", event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            MOU Start To
            <input
              type="date"
              value={filters.mou_start_to || ""}
              onChange={(event) => onFilterChange?.("mou_start_to", event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            MOU End From
            <input
              type="date"
              value={filters.mou_end_from || ""}
              onChange={(event) => onFilterChange?.("mou_end_from", event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            MOU End To
            <input
              type="date"
              value={filters.mou_end_to || ""}
              onChange={(event) => onFilterChange?.("mou_end_to", event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </label>
          {["enrolled_from", "enrolled_to", "converted_from", "converted_to", "contract_from", "contract_to"].map((field) => (
            <label key={field} className="block text-xs font-medium text-slate-600">
              {({ enrolled_from: "Enrolled From", enrolled_to: "Enrolled To", converted_from: "Converted From", converted_to: "Converted To", contract_from: "Contract Signed From", contract_to: "Contract Signed To" })[field]}
              <input
                type="date"
                value={filters[field] || ""}
                onChange={(event) => onFilterChange?.(field, event.target.value)}
                disabled={loading}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </label>
          ))}
          <label className="block text-xs font-medium text-slate-600">
            Renewals Due
            <select
              value={filters.renewals || ""}
              onChange={(event) => onFilterChange?.("renewals", event.target.value)}
              disabled={loading}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            >
              <option value="">Any date</option>
              <option value="30">Within 30 days</option>
              <option value="60">Within 60 days</option>
            </select>
          </label>
          {filterOptionsError && (
            <p className="self-end text-xs text-rose-600 sm:col-span-2 xl:col-span-4" role="alert">
              {filterOptionsError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
