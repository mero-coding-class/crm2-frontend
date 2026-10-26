import React, { useState, useEffect, useRef, useMemo } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import DraggableRow from "./DraggableRow";
import ColumnToggler from "./ColumnToggler";
import { Folder, Plus, FileUp, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import ImportCsvButton from "./ImportCsvButton";
import ActivityModal from "./ActivityModal";
import ActivityLogViewModal from "./ActivityLogViewModal";
import EnrollModal from "./EnrollModal";

const initialColumns = {
  // Visible by default — matches crm2-backend LeadSummarySerializer fields
  actions: { label: "Actions", visible: true },
  school_name: { label: "School Name", visible: true },
  municipality: { label: "Municipality", visible: true },
  contact_person: { label: "Contact Person", visible: true },
  contact_number: { label: "Contact Number", visible: true },
  sub_status: { label: "Sub-Status", visible: true },
  approval: { label: "Approval", visible: true },
  // Additional fields included in the backend summary response
  id: { label: "ID", visible: false },
  system_id: { label: "System ID", visible: false },
  district: { label: "District", visible: false },
};

const LeadTableDisplay = ({
  leads = [],
  handleEdit,
  handleDelete,
  handleBulkDelete,
  canManageLeads = false,
  isAdmin = false,
  onActivitySave,
  authToken,
  currentPage: parentCurrentPage,
  totalPages: parentTotalPages,
  onPageChange: parentOnPageChange,
  handleOpenAddModal,
}) => {
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [columns, setColumns] = useState(initialColumns);
  const [activityModalLead, setActivityModalLead] = useState(null);
  // Task 3.4: Eye icon view modal state
  const [viewModalLead, setViewModalLead] = useState(null);
  const [enrollModalLead, setEnrollModalLead] = useState(null);
  const handleSaveActivity = async (activityData) => {
    if (!activityModalLead) return;
    const leadId = activityModalLead.id || activityModalLead._id;
    await onActivitySave(leadId, activityData);
  };

  const tableContainerRef = useRef(null);

  // The backend provides numeric IDs on every lead summary row.
  const dedupLeads = React.useCallback((arr = []) => {
    const seen = new Set();
    const out = [];
    for (const l of arr) {
      if (!l) continue;
      const key = String(l.id ?? l._id ?? "");
      if (!key) continue;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(l);
      }
    }
    return out;
  }, []);

  // Edge-hover horizontal auto-scroll ONLY.
  // Mouse wheel should remain vertical (no conversion). Horizontal scroll happens
  // only when pointer is near left/right edges.
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const hasOverflow = () => container.scrollWidth > container.clientWidth + 2;
    if (!hasOverflow()) return; // no need to attach handlers

    let direction = 0; // -1..1
    let rafId;
    const EDGE = 100;
    const SPEED = 18; // px per frame at full edge pressure

    const updateDirection = (x) => {
      const { left, right } = container.getBoundingClientRect();
      if (x < left + EDGE) {
        const dist = x - left;
        const factor = (EDGE - dist) / EDGE; // 0..1
        direction = -factor;
      } else if (x > right - EDGE) {
        const dist = right - x;
        const factor = (EDGE - dist) / EDGE;
        direction = factor;
      } else direction = 0;
    };

    const onPointerMove = (e) => updateDirection(e.clientX);
    const onPointerLeave = () => (direction = 0);

    const step = () => {
      if (direction !== 0) {
        container.scrollLeft += direction * SPEED;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("mousemove", onPointerMove); // fallback
    container.addEventListener("mouseleave", onPointerLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("mousemove", onPointerMove);
      container.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [leads, columns]);

  // Keep the list row aligned with the compact LeadSummarySerializer payload.
  const normalizedLeads = useMemo(
    () =>
      dedupLeads(leads).map((lead) => ({
        ...lead,
        _id: String(lead.id ?? lead._id),
        sub_status: lead.sub_status || "New",
      })),
    [leads, dedupLeads]
  );

  // Initialize remarks and selection on lead changes
  useEffect(() => {
    setSelectedLeads(new Set());
  }, [normalizedLeads]);

  // (Removed previous advanced scroll behaviors: wheel vertical->horizontal translation, drag inertia, and duplicate pointer edge logic)

  const totalPages = parentTotalPages || 1;

  const currentPage = parentCurrentPage || 1;
  const currentLeads = normalizedLeads;

  // Scroll table container to top when currentPage changes
  useEffect(() => {
    try {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = 0;
      }
    } catch {
      // The scroll reset is best-effort when the table is unmounted.
    }
  }, [currentPage]);

  const handleSelectRow = (leadId) => {
    setSelectedLeads((prev) => {
      const newSelection = new Set(prev);
      newSelection.has(leadId)
        ? newSelection.delete(leadId)
        : newSelection.add(leadId);
      return newSelection;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = currentLeads.map((lead) => lead._id);
      setSelectedLeads(new Set([...selectedLeads, ...ids]));
    } else {
      const newSelection = new Set(selectedLeads);
      currentLeads.forEach((lead) => newSelection.delete(lead._id));
      setSelectedLeads(newSelection);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) parentOnPageChange?.(pageNumber);
  };

  const onBulkDeleteClick = () => {
    handleBulkDelete([...selectedLeads]);
    setSelectedLeads(new Set());
  };

  const visibleKeys = useMemo(
    () =>
      Object.entries(columns)
        .filter(([, c]) => c.visible)
        .map(([k]) => k),
    [columns]
  );

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white min-h-[420px]">
        <div className="w-16 h-16 rounded-[18px] bg-[#EDF2FC] flex items-center justify-center mb-5 text-[#294998]">
          <Folder className="w-8 h-8 stroke-[1.75]" />
        </div>
        <h2 className="text-[18px] font-[600] text-slate-900 mb-2 tracking-[-0.01em]">
          No active leads found matching your criteria
        </h2>
        <p className="text-[14px] text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          No active leads found matching your criteria. Start adding new admissions candidates or import via CSV.
        </p>
        <div className="flex items-center justify-center gap-3">
            {canManageLeads && handleOpenAddModal && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1E3776] text-white shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add New Lead
            </button>
          )}
          {canManageLeads && (
            <ImportCsvButton
              authToken={authToken}
              id="emptyStateCsvUpload"
              customButton={
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors">
                  <FileUp className="h-4 w-4" />
                  Import CSV
                </div>
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions & Column toggler */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          {canManageLeads && selectedLeads.size > 0 && (
            <>
              <span className="text-[13px] text-slate-600">
                <span className="font-[600] text-[#294998]">{selectedLeads.size}</span> selected
              </span>
              <button
                onClick={onBulkDeleteClick}
                className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-[500] rounded-[6px] bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Move to Archive ({selectedLeads.size})
              </button>
            </>
          )}
        </div>
        <ColumnToggler columns={columns} setColumns={setColumns} />
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto custom-scrollbar"
        ref={tableContainerRef}
      >
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 h-9 w-10 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={
                        currentLeads.length > 0 &&
                        currentLeads.every((lead) =>
                          selectedLeads.has(lead._id)
                        )
                      }
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
                    />
                  </th>
                  {(() => {
                    const visibleEntries = Object.entries(columns).filter(
                      ([, { visible }]) => visible
                    );
                    return visibleEntries.map(([key, { label }]) => (
                      <th
                        key={key}
                        className="px-3 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {(() => {
                  if (currentLeads.length === 0) {
                    return (
                      <tr>
                        <td
                          colSpan={visibleKeys.length + 1}
                          className="py-16 text-center"
                        >
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center px-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#EDF2FC] flex items-center justify-center mb-3 text-[#294998] shadow-sm border border-[#CDDBF6]">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">
                              No leads found
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                              No leads are available to display. Add your first school lead to start managing interactions.
                            </p>
                            {canManageLeads && handleOpenAddModal && (
                              <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#294998] hover:bg-[#1E3776] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add New Lead</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  // Recompute the visible keys in the exact same order used above
                  return currentLeads.map((lead) => (
                    <DraggableRow
                      key={lead._id}
                      lead={lead}
                      columns={columns}
                      columnOrder={visibleKeys}
                      selected={selectedLeads.has(lead._id)}
                      onSelect={handleSelectRow}
                      handleEdit={handleEdit}
                      handleDelete={handleDelete}
                      canManageLeads={canManageLeads}
                      isAdmin={isAdmin}
                      onOpenActivityModal={(leadToView) =>
                        setActivityModalLead(leadToView)
                      }
                      // Task 3.4: Eye icon opens read-only Activity Log view
                      onOpenViewModal={(leadToView) =>
                        setViewModalLead(leadToView)
                      }
                      onOpenEnrollModal={(leadToEnroll) =>
                        setEnrollModalLead(leadToEnroll)
                      }
                    />
                  ));
                })()}
              </tbody>
            </table>
      </div>

      {/* ─── Pagination Footer: Identical to Archive ─── */}
      <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-500">
        <div className="whitespace-nowrap">
          Showing {currentLeads.length} of {normalizedLeads.length} leads
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="px-3 py-1 rounded-[6px] bg-slate-50 text-slate-700 text-[12px] font-[600] whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activityModalLead && (
        <ActivityModal
          lead={activityModalLead}
          authToken={authToken}
          onClose={() => setActivityModalLead(null)}
          onSave={handleSaveActivity}
        />
      )}

      {/* Task 3.4: Activity Log View modal (read-only, eye icon) */}
      {viewModalLead && (
        <ActivityLogViewModal
          lead={viewModalLead}
          authToken={authToken}
          onClose={() => setViewModalLead(null)}
        />
      )}

      {enrollModalLead && (
        <EnrollModal
          isOpen={!!enrollModalLead}
          lead={enrollModalLead}
          authToken={authToken}
          onClose={() => setEnrollModalLead(null)}
        />
      )}
    </div>
  );
};

export default LeadTableDisplay;
