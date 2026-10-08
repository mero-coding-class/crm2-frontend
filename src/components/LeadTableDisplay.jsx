import React, { useState, useEffect, useRef, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DraggableRow from "./DraggableRow";
import ColumnToggler from "./ColumnToggler";
import { leadService } from "../services/api";
import { Folder, Plus, FileUp } from "lucide-react";
import ImportCsvButton from "./ImportCsvButton";

const initialColumns = {
  actions: { label: "Actions", visible: true },
  school_college_name: { label: "School Name", visible: true },
  address_line_1: { label: "Municipality", visible: true },
  student_name: { label: "Contact Person", visible: true },
  phone_number: { label: "Contact Number", visible: true },
  source: { label: "Activity", visible: true },
  substatus: { label: "Sub-Status", visible: true },
  scheduled_taken: { label: "Demo Schedule", visible: true },
  // Hidden columns — visible only via Edit modal
  id: { label: "ID", visible: false },
  parents_name: { label: "Parents' Name", visible: false },
  email: { label: "Email", visible: false },
  whatsapp_number: { label: "WhatsApp Number", visible: false },
  age: { label: "Age", visible: false },
  grade: { label: "Grade", visible: false },
  course_name: { label: "Course", visible: false },
  course_duration: { label: "Course Duration", visible: false },
  course_type: { label: "Course Type", visible: false },
  status: { label: "Status", visible: false },
  class_type: { label: "Class Type", visible: false },
  shift: { label: "Shift", visible: false },
  previous_coding_experience: { label: "Previous Coding", visible: false },
  lead_type: { label: "Lead Type", visible: false },
  value: { label: "Value", visible: false },
  adset_name: { label: "Adset Name", visible: false },
  payment_type: { label: "Payment Type", visible: false },
  first_installment: { label: "First Installment", visible: false },
  first_invoice: { label: "First Invoice", visible: false },
  device: { label: "Device", visible: false },
  last_call: { label: "Last Call", visible: false },
  next_call: { label: "Next Call", visible: false },
  created_at: { label: "Created At", visible: false },
  updated_at: { label: "Updated At", visible: false },
  remarks: { label: "Remarks", visible: false },
  address_line_2: { label: "Address Line 2", visible: false },
  city: { label: "City", visible: false },
  county: { label: "County", visible: false },
  post_code: { label: "Post Code", visible: false },
  assigned_to: { label: "Assigned To", visible: false },
  created_by_username: { label: "Created By", visible: false },
  change_log: { label: "Change Log", visible: false },
};

const LeadTableDisplay = ({
  leads = [],
  handleEdit,
  handleDelete,
  handleBulkDelete,
  onStatusChange,
  onSubStatusChange,
  onRemarkChange,
  onRecentCallChange: onLastCallChange,
  onNextCallChange,
  onAgeChange,
  onGradeChange,
  onCourseDurationChange,
  onShiftChange,
  onDemoScheduledChange,
  onAssignedToChange,
  authToken,
  changeLogService,
  users = [],
  usersLoading = false,
  currentUserRole,
  currentPage: parentCurrentPage,
  totalPages: parentTotalPages,
  onPageChange: parentOnPageChange,
  leadsPerPage: parentLeadsPerPage,
  // Parent-provided field updater to reflect changes immediately in UI
  handleFieldChange,
  handleOpenAddModal,
  courses,
  handleRefresh,
}) => {
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  // savedRemarks = server-confirmed text for each row (can contain up to 5 lines)
  // localRemarks = input buffer for adding a new single remark per row
  const [localRemarks, setLocalRemarks] = useState({});
  const [savedRemarks, setSavedRemarks] = useState({});
  const [columns, setColumns] = useState(initialColumns);
  const [internalPage, setInternalPage] = useState(1);
  const pageSize = parentLeadsPerPage || 20;

  const tableContainerRef = useRef(null);

  // Final guard: deduplicate incoming leads by normalized id/email to avoid
  // transient duplicate rows if upstream state briefly contains duplicates.
  const dedupLeads = React.useCallback((arr = []) => {
    const seen = new Set();
    const out = [];
    const norm = (v) => (v === undefined || v === null ? "" : String(v).trim());
    for (const l of arr) {
      if (!l) continue;
      const key =
        norm(l.id) ||
        norm(l._id) ||
        norm(l.email) ||
        `${norm(l.student_name)}-${norm(l.phone_number)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(l);
      }
    }
    return out;
  }, []);

  // Smooth scroll helper used by the arrow buttons
  const smoothScroll = (distance) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

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

  // Normalize lead data to avoid undefined and match backend field names
  // Ensure a stable, unique `_id` for each lead so per-row state (remarks,
  // selection, change-log) doesn't collide when backend uses different id
  // fields or omits them.
  const normalizedLeads = useMemo(
    () =>
      dedupLeads(leads).map((lead, _idx) => ({
        ...lead,
        // guarantee a unique id: prefer _id, then id, then email/phone, then index
        _id:
          lead._id ||
          lead.id ||
          lead.email ||
          lead.phone_number ||
          `lead-${_idx}`,
        // Use the actual backend ID without modification
        id: lead.id || "",
        student_name: lead.student_name || "N/A",
        parents_name: lead.parents_name || "N/A",
        email: lead.email || "",
        phone_number: lead.phone_number || "",
        whatsapp_number: lead.whatsapp_number || "",
        age: lead.age || "",
        grade: lead.grade || "",
        source: lead.source || "",
        course_name: lead.course_name || "N/A",
        class_type: lead.class_type || "",
        lead_type: lead.lead_type || lead.leadType || "",
        shift: lead.shift || "",
        last_call: lead.last_call || "",
        next_call: lead.next_call || "",
        status: lead.status || lead.status || "New",
        // backend may use `substatus` or `sub_status`
        // Ensure both variants match by using the most recently provided value
        sub_status: lead.substatus || lead.sub_status || "New",
        substatus: lead.substatus || lead.sub_status || "New",
        remarks: lead.remarks || "",
        previous_coding_experience: lead.previous_coding_experience || "",
        value: lead.value || "",
        device: lead.device || "",
        payment_type: lead.payment_type || "",
        // school/college name normalize
        school_college_name:
          lead.school_college_name || lead.school_college_name || "",
        // assigned username
        assigned_to_username:
          lead.assigned_to_username ||
          lead.assigned_to ||
          lead.assigned_to_username ||
          "",
        // ensure assigned_to is present for the editable input (prefer assigned_to, fallback to username)
        assigned_to: lead.assigned_to || lead.assigned_to_username || "",
      })),
    [leads, dedupLeads]
  );

  // Initialize remarks and selection on lead changes
  useEffect(() => {
    const initialSaved = {};
    const initialLocal = {};
    normalizedLeads.forEach((lead) => {
      initialSaved[lead._id] = lead.remarks || "";
      // local input starts empty; user types to add a fresh remark
      initialLocal[lead._id] = "";
    });
    setLocalRemarks(initialLocal);
    setSavedRemarks(initialSaved);
    setSelectedLeads(new Set());

    if (parentControlsPagination) {
      // Parent is authoritative; don't change parent's page here.
    } else {
      // Reset internal page to 1 for client-side pagination updates.
      setInternalPage(1);
    }
  }, [normalizedLeads]);

  // Keep localRemarks in sync when a remark is updated elsewhere (or from server)
  useEffect(() => {
    const onRemarkUpdated = (e) => {
      try {
        const { id, remarks } = e?.detail || {};
        if (!id) return;
        // find matching row by backend id or by constructed _id
        const match = normalizedLeads.find(
          (l) => String(l.id) === String(id) || String(l._id) === String(id)
        );
        if (match) {
          // update savedRemarks (server-confirmed) only; localRemarks remains
          // the live editing buffer controlled by the textarea onChange.
          setSavedRemarks((prev) => ({ ...prev, [match._id]: remarks }));
        }
      } catch (err) {
        console.warn(
          "LeadTableDisplay failed to handle crm:remarkUpdated",
          err
        );
      }
    };

    window.addEventListener("crm:remarkUpdated", onRemarkUpdated);
    return () =>
      window.removeEventListener("crm:remarkUpdated", onRemarkUpdated);
  }, [normalizedLeads]);

  // (Removed previous advanced scroll behaviors: wheel vertical->horizontal translation, drag inertia, and duplicate pointer edge logic)

  const computedTotalPages = Math.ceil(normalizedLeads.length / pageSize) || 1;
  const totalPages = parentTotalPages || computedTotalPages;

  const parentControlsPagination =
    typeof parentCurrentPage === "number" &&
    typeof parentOnPageChange === "function";

  const currentPage = parentControlsPagination
    ? parentCurrentPage
    : internalPage;

  const sortedLeads = [...normalizedLeads].sort((a, b) => {
    const dateA = new Date(a.created_at || a.addDate || 0);
    const dateB = new Date(b.created_at || b.addDate || 0);
    return dateB - dateA; // newest first
  });

  // If parent controls pagination we assume it has already supplied the
  // appropriate subset of `leads`. Otherwise slice the sorted leads by internal pagination.
  const currentLeads = parentControlsPagination
    ? sortedLeads
    : sortedLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Scroll table container to top when currentPage changes
  useEffect(() => {
    try {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = 0;
      }
    } catch (e) {
      // ignore
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
    // If parent controls the page (it passed parentCurrentPage), delegate
    // page changes to the parent's handler. Otherwise update internal state.
    if (typeof parentCurrentPage !== "undefined" && parentOnPageChange) {
      parentOnPageChange(pageNumber);
      return;
    }

    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setInternalPage(pageNumber);
    } else {
      // invalid page number, ignore
    }
  };

  const onBulkDeleteClick = () => {
    handleBulkDelete([...selectedLeads]);
    setSelectedLeads(new Set());
  };

  // Debug log to check incoming leads data
  // Inline update handlers for course_type & class_type
  const handleCourseTypeChange = async (leadId, value) => {
    try {
      await leadService.updateLead(leadId, { course_type: value }, authToken);
      // Reflect in parent state so UI updates without waiting for other changes
      if (typeof handleFieldChange === "function") {
        handleFieldChange(leadId, "course_type", value);
      }
    } catch (e) {
      console.warn("Failed to update course_type", e);
    }
  };

  const handleClassTypeChange = async (leadId, value) => {
    try {
      await leadService.updateLead(leadId, { class_type: value }, authToken);
      if (typeof handleFieldChange === "function") {
        handleFieldChange(leadId, "class_type", value);
      }
    } catch (e) {
      console.warn("Failed to update class_type", e);
    }
  };

  // Forward scheduled_taken changes (legacy prop name kept for row component)
  const handleScheduledTakenChange = async (leadId, value) => {
    try {
      await leadService.updateLead(
        leadId,
        { scheduled_taken: value },
        authToken
      );
      if (typeof onDemoScheduledChange === "function") {
        onDemoScheduledChange(leadId, value);
      }
    } catch (e) {
      console.warn("Failed to update scheduled_taken", e);
    }
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
        <div className="w-16 h-16 rounded-[18px] bg-[#EEF2FF] flex items-center justify-center mb-5 text-[#4F46E5]">
          <Folder className="w-8 h-8 stroke-[1.75]" />
        </div>
        <h2 className="text-[18px] font-[600] text-slate-900 mb-2 tracking-[-0.01em]">
          No active leads found matching your criteria
        </h2>
        <p className="text-[14px] text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          No active leads found matching your criteria. Start adding new admissions candidates or import via CSV.
        </p>
        <div className="flex items-center justify-center gap-3">
          {handleOpenAddModal && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] text-[13px] font-[500] bg-[#4F46E5] hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add New Lead
            </button>
          )}
          <ImportCsvButton
            authToken={authToken}
            courses={courses}
            onImported={handleRefresh}
            id="emptyStateCsvUpload"
            customButton={
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors">
                <FileUp className="h-4 w-4" />
                Import CSV
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions & Column toggler */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          {selectedLeads.size > 0 && (
            <>
              <span className="text-[13px] text-slate-600">
                <span className="font-[600] text-indigo-600">{selectedLeads.size}</span> selected
              </span>
              <button
                onClick={onBulkDeleteClick}
                className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-[500] rounded-[6px] bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete ({selectedLeads.size})
              </button>
            </>
          )}
        </div>
        <ColumnToggler columns={columns} setColumns={setColumns} />
      </div>

      {/* Table */}
      <div className="relative">
        <button
          onClick={() => smoothScroll(-500)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow-md transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeftIcon className="h-4 w-4 text-slate-500" />
        </button>
        <button
          onClick={() => smoothScroll(500)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow-md transition-all"
          aria-label="Scroll right"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-500" />
        </button>

        <div
          className="overflow-x-auto custom-scrollbar"
          ref={tableContainerRef}
        >
          <DndContext collisionDetection={closestCenter}>
            <SortableContext
              items={currentLeads.map((l) => l._id)}
              strategy={verticalListSortingStrategy}
            >
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 h-9 w-10">
                      <span className="sr-only">Drag</span>
                    </th>
                    <th className="px-3 h-9 w-10">
                      <input
                        type="checkbox"
                        checked={currentLeads.every((lead) =>
                          selectedLeads.has(lead._id)
                        )}
                        onChange={handleSelectAll}
                        className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    {(() => {
                      const visibleEntries = Object.entries(columns).filter(
                        ([, { visible }]) => visible
                      );
                      const visibleKeys = visibleEntries.map(([k]) => k);
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
                    // Recompute the visible keys in the exact same order used above
                    return currentLeads.map((lead, index) => (
                      <DraggableRow
                        key={lead._id}
                        rowIndex={index}
                        lead={{
                          ...lead,
                          _users: users || [],
                          _usersLoading: usersLoading,
                          _currentUserRole: currentUserRole,
                          class_type: lead.class_type || "",
                          course_type: lead.course_type || "",
                          scheduled_taken:
                            lead.scheduled_taken || lead.demo_scheduled || "No",
                        }}
                        columns={columns}
                        columnOrder={visibleKeys}
                        savedRemarks={savedRemarks}
                        selected={selectedLeads.has(lead._id)}
                        onSelect={handleSelectRow}
                        localRemarks={localRemarks}
                        setLocalRemarks={setLocalRemarks}
                        handleEdit={handleEdit}
                        handleDelete={handleDelete}
                        onStatusChange={onStatusChange}
                        onSubStatusChange={onSubStatusChange}
                        onRemarkChange={onRemarkChange}
                        onRecentCallChange={onLastCallChange}
                        onNextCallChange={onNextCallChange}
                        onAgeChange={onAgeChange}
                        onGradeChange={onGradeChange}
                        onCourseDurationChange={onCourseDurationChange}
                        onShiftChange={onShiftChange}
                        // onDemoScheduledChange prop name retained for backward compatibility.
                        // Internally this updates canonical scheduled_taken field.
                        onDemoScheduledChange={handleScheduledTakenChange}
                        onAssignedToChange={onAssignedToChange}
                        authToken={authToken}
                        changeLogService={changeLogService}
                        onCourseTypeChange={handleCourseTypeChange}
                        onClassTypeChange={handleClassTypeChange}
                      />
                    ));
                  })()}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
        <span className="text-[13px] text-slate-500">
          Page <span className="font-[600] text-slate-800">{currentPage}</span> of <span className="font-[600] text-slate-800">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 rounded-[6px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) page = i + 1;
            else if (currentPage <= 3) page = i + 1;
            else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
            else page = currentPage - 2 + i;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-8 min-w-[32px] px-2 rounded-[6px] text-[13px] font-[500] transition-colors ${
                  page === currentPage
                    ? "bg-indigo-600 text-white border border-indigo-600"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 rounded-[6px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadTableDisplay;
