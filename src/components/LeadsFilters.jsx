// src/components/LeadsFilters.jsx
// Global Filter Changes per task list:
// REMOVE: Filter by Status, Class filter, Device filter, By Age filter, By Grade filter
// ADD: Followup Date filter, Followup From date filter, Followup To date filter
import React from "react";
import { X, ChevronDown, Search } from "lucide-react";

const FilterPill = ({ label, value, onChange, options, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15"
      style={{ minWidth: "120px" }}
    >
      {options.map((opt) => (
        <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
          {typeof opt === "string" ? opt : opt.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
  </div>
);

const LeadsFilters = ({
  showFilters,
  // Kept but NOT rendered: filterStatus, filterAge, filterGrade, filterClassType, filterDevice
  filterStatus,
  setFilterStatus,
  filterAge,
  setFilterAge,
  filterGrade,
  setFilterGrade,
  filterLastCall,
  setFilterLastCall,
  filterClassType,
  setFilterClassType,
  filterShift,
  setFilterShift,
  filterDevice,
  setFilterDevice,
  filterSubStatus,
  setFilterSubStatus,
  filterPrevCodingExp,
  setFilterPrevCodingExp,
  filterAssignedTo,
  setFilterAssignedTo,
  // New: Followup Date filters
  filterFollowupDate,
  setFilterFollowupDate,
  filterFollowupFrom,
  setFilterFollowupFrom,
  filterFollowupTo,
  setFilterFollowupTo,
  onClearFilters,
  users,
  usersLoading,
  classTypeOptions,
  deviceOptions,
  subStatusOptions,
  previousCodingExpOptions,
  searchTerm,
  setSearchTerm,
}) => {
  if (!showFilters) return null;

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center gap-2">
        {setSearchTerm && (
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search leads, schools…"
              value={searchTerm || ""}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
            />
          </div>
        )}

        <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] mr-1">
          Filter by:
        </span>

        {/* Sub-status — KEPT */}
        <FilterPill
          value={filterSubStatus}
          onChange={setFilterSubStatus}
          options={subStatusOptions}
        />

        {/* Assigned to — KEPT */}
        <div className="relative">
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15"
            style={{ minWidth: "140px" }}
          >
            <option value="">All Counselors</option>
            {!usersLoading &&
              Array.isArray(users) &&
              users.map((u) => (
                <option key={u.id || u.username} value={u.username || u.id}>
                  {u.username || u.name || u.email || String(u.id)}
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
        </div>

        {/* ─── ADD: Followup Date filters ─── */}
        {/* Exact followup date */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-[500] text-slate-500 whitespace-nowrap">Followup:</span>
          <input
            type="date"
            value={filterFollowupDate || ""}
            onChange={(e) => setFilterFollowupDate && setFilterFollowupDate(e.target.value)}
            className="h-8 px-2 text-[12px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
            title="Filter by exact followup date"
          />
        </div>

        {/* Followup From */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-[500] text-slate-500 whitespace-nowrap">From:</span>
          <input
            type="date"
            value={filterFollowupFrom || ""}
            onChange={(e) => setFilterFollowupFrom && setFilterFollowupFrom(e.target.value)}
            className="h-8 px-2 text-[12px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
            title="Followup date from"
          />
        </div>

        {/* Followup To */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-[500] text-slate-500 whitespace-nowrap">To:</span>
          <input
            type="date"
            value={filterFollowupTo || ""}
            onChange={(e) => setFilterFollowupTo && setFilterFollowupTo(e.target.value)}
            className="h-8 px-2 text-[12px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
            title="Followup date to"
          />
        </div>

        {/* ─── REMOVED: Status filter, Class filter, Device filter, Age filter, Grade filter ─── */}
        {/* These filters have been intentionally removed per project requirements */}

        {/* Clear */}
        <button
          type="button"
          onClick={onClearFilters}
          className="flex items-center gap-1 h-8 px-3 text-[13px] font-[500] rounded-[9999px] border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
        >
          <X className="h-3 w-3" />
          Clear all
        </button>
      </div>
    </div>
  );
};

export default LeadsFilters;
