import React from "react";
import { X, ChevronDown, Search } from "lucide-react";

const FilterPill = ({ label, value, onChange, options, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12"
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
              placeholder="Search leads, students…"
              value={searchTerm || ""}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12 hover:border-slate-300 transition-colors"
            />
          </div>
        )}

        <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] mr-1">
          Filter by:
        </span>

        {/* Status pill */}
        <FilterPill
          value={filterStatus}
          onChange={setFilterStatus}
          options={["All", "Active", "Converted", "Lost"]}
          placeholder="Status"
        />

        {/* Sub-status */}
        <FilterPill
          value={filterSubStatus}
          onChange={setFilterSubStatus}
          options={subStatusOptions}
        />

        {/* Class type */}
        <FilterPill
          value={filterClassType}
          onChange={setFilterClassType}
          options={classTypeOptions}
        />

        {/* Device */}
        <FilterPill
          value={filterDevice}
          onChange={setFilterDevice}
          options={deviceOptions}
        />

        {/* Coding exp */}
        <FilterPill
          value={filterPrevCodingExp}
          onChange={setFilterPrevCodingExp}
          options={previousCodingExpOptions}
        />

        {/* Assigned to */}
        <div className="relative">
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12"
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

        {/* Age text filter */}
        <input
          type="text"
          placeholder="Age…"
          value={filterAge}
          onChange={(e) => setFilterAge(e.target.value)}
          className="h-8 px-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 w-20 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12 hover:border-slate-300 transition-colors"
        />

        {/* Grade text filter */}
        <input
          type="text"
          placeholder="Grade…"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="h-8 px-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 w-24 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12 hover:border-slate-300 transition-colors"
        />

        {/* Date filter */}
        <input
          type="date"
          value={filterLastCall}
          onChange={(e) => setFilterLastCall(e.target.value)}
          className="h-8 px-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/12 hover:border-slate-300 transition-colors"
        />

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
