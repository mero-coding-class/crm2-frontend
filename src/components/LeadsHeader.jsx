import React from "react";
import { Plus, RotateCw, ListFilter, FileUp, FileDown } from "lucide-react";
import ImportCsvButton from "./ImportCsvButton";

const LeadsHeader = ({
  handleOpenAddModal,
  canManageLeads,
  authToken,
  handleRefresh,
  handleExport,
  fetchingAll,
  showFilters,
  setShowFilters,
  totalCount = 0,
}) => {
  return (
    <div className="px-6 py-5 border-b border-slate-200 bg-white">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left: Title + Badge + Subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em]">
              Leads Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
              {totalCount} Total
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage, filter, import and track school leads across intake channels.
          </p>
        </div>

        {/* Right: Actions (all in the same row) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${showFilters
                ? "bg-[#edf2fc] text-[#294998] ring-1 ring-[#cddbf6]"
                : "bg-[#EEF2F6] hover:bg-slate-200 text-slate-700"
              }`}
          >
            <ListFilter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </button>

          {canManageLeads && (
            <ImportCsvButton
              authToken={authToken}
              id="headerCsvUpload"
              customButton={
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors">
                  <FileUp className="h-4 w-4" />
                  Import CSV / Excel
                </div>
              }
            />
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </button>

          {canManageLeads && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1e3776] text-white shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add New Lead
            </button>
          )}
        </div>
      </div>

      {fetchingAll && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-[#294998] animate-pulse" />
          Fetching full dataset — this may take a moment…
        </div>
      )}
    </div>
  );
};

export default LeadsHeader;
