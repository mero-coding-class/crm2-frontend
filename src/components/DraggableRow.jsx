// src/components/DraggableRow.jsx
import React, { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import LeadLogDisplay from "./LeadLogDisplay";
import {
  getCourseClasses,
  getStatusClasses,
  getSubStatusClasses,
} from "./helpers"; // Removed unused getFormattedDate

const DraggableRow = ({
  lead,
  columns,
  columnOrder, // array of visible column keys in header order
  rowIndex, // sequential number for display
  selected,
  onSelect,
  localRemarks,
  setLocalRemarks,
  savedRemarks,
  handleEdit,
  handleDelete,
  onOpenActivityModal,
  // Task 3.4: eye icon opens read-only Activity Log view
  onOpenViewModal,
  onOpenEnrollModal,
  onStatusChange,
  onSubStatusChange,
  onRemarkChange,
  onRecentCallChange: onLastCallChange,
  onNextCallChange,
  onAgeChange,
  onGradeChange,
  onCourseDurationChange,
  onAssignedToChange,
  onShiftChange,
  onDemoScheduledChange,
  onCourseTypeChange,
  onClassTypeChange,
  authToken,
  changeLogService,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  // No need for additional normalization as it's handled in parent component
  const handleLocalRemarkChange = (value) => {
    const leadId = lead._id || lead.id; // Use either ID format
    setLocalRemarks((prev) => ({ ...prev, [leadId]: value }));
  };

  // For remarks display: show first (latest) by default, allow show more up to 5
  const [showAllRemarks, setShowAllRemarks] = useState(false);
  // Normalize remarks to a plain string to avoid runtime errors when value is
  // an array/object/number (e.g., after optimistic updates or server shapes)
  const normalizeRemarkText = (val) => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      // If it's an array of strings or objects, join by newlines extracting 'text' if present
      try {
        return val
          .map((item) => {
            if (item == null) return "";
            if (typeof item === "string") return item;
            if (typeof item === "object") {
              if (typeof item.text === "string") return item.text;
              if (typeof item.remarks === "string") return item.remarks;
              return JSON.stringify(item);
            }
            return String(item);
          })
          .filter((s) => s && s.trim().length > 0)
          .join("\n");
      } catch {
        return val.join("\n");
      }
    }
    if (typeof val === "object") {
      if (typeof val.text === "string") return val.text;
      if (typeof val.remarks === "string") return val.remarks;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const savedRemarkText = normalizeRemarkText(
    (savedRemarks && savedRemarks[lead._id]) || lead.remarks || ""
  );
  const remarkLines = savedRemarkText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 5);
  const visibleLines = showAllRemarks ? remarkLines : remarkLines.slice(0, 1);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-slate-50/80 transition-colors ${
        selected ? "bg-[#EDF2FC]/60" : ""
      }`}
    >
      <td className="px-3 py-3 whitespace-nowrap text-center w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(lead._id)}
          className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
        />
      </td>

      {/* Dynamic Column Rendering - no changes needed here */}
      {(columnOrder || Object.keys(columns)).map((key) => {
        // support older prop shapes: if columnOrder not provided, skip invisible
        if (!columnOrder && !columns[key].visible) return null;

        const renderCell = () => {
          switch (key) {
            case "school_name":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                >
                  {lead.school_name && String(lead.school_name).trim() !== ""
                    ? lead.school_name
                    : "N/A"}
                </td>
              );
            case "municipality":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.municipality && String(lead.municipality).trim() !== ""
                    ? lead.municipality
                    : lead.district || "N/A"}
                </td>
              );
            case "contact_person":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.contact_person || "N/A"}
                </td>
              );
            case "contact_number":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.contact_number && String(lead.contact_number).trim() !== ""
                    ? lead.contact_number
                    : "N/A"}
                </td>
              );
            case "alt_number":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.alt_number || "—"}
                </td>
              );
            case "alt_contact_person":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.alt_contact_person || "—"}
                </td>
              );
            case "district":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.district || "N/A"}
                </td>
              );
            case "address":
              return (
                <td key={key} className="px-3 py-4 text-sm text-gray-700 max-w-[200px] truncate">
                  {lead.address || "N/A"}
                </td>
              );
            case "system_id":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                  {lead.system_id || "—"}
                </td>
              );
            case "social_media":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.social_media ? (
                    <a href={lead.social_media} target="_blank" rel="noreferrer"
                      className="text-[#294998] hover:underline text-xs">
                      {lead.social_media.length > 30
                        ? lead.social_media.slice(0, 30) + "…"
                        : lead.social_media}
                    </a>
                  ) : "—"}
                </td>
              );
            case "course_interest":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.course_interest || "—"}
                </td>
              );
            case "proposal_status":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    lead.proposal_status
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {lead.proposal_status ? "Sent" : "No"}
                  </span>
                </td>
              );
            case "demo_scheduled":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    lead.demo_scheduled
                      ? "bg-purple-100 text-purple-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {lead.demo_scheduled ? "Yes" : "No"}
                  </span>
                </td>
              );
            case "owner_username":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.owner_username || "—"}
                </td>
              );
            case "call_assignee_username":
              return (
                <td key={key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                  {lead.call_assignee_username || "—"}
                </td>
              );
            case "sub_status":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    {/* Read-only sub-status badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${getSubStatusClasses(lead.sub_status)}`}
                    >
                      {lead.sub_status || "New"}
                    </span>
                    {/* Eye icon — opens Activity Log view modal */}
                    <button
                      type="button"
                      title="View Activity Log"
                      onClick={() => onOpenViewModal && onOpenViewModal(lead)}
                      className="p-1 text-slate-400 hover:text-[#294998] hover:bg-[#EDF2FC] rounded transition-colors"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    Change via Activity Log
                  </p>
                </td>
              );

            case "source":
              return (
                <td
                  key={key}
                  className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    {/* Task 3.4: Eye icon — opens read-only Activity Log view */}
                    <button
                      type="button"
                      onClick={() => onOpenViewModal && onOpenViewModal(lead)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-200 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-95 cursor-pointer"
                      title="View Activity Log (read-only)"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenActivityModal && onOpenActivityModal(lead)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#EDF2FC] hover:bg-[#DCE6F9] text-[#294998] hover:text-[#1E3776] border border-[#CDDBF6] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#294998]/20 active:scale-95 cursor-pointer"
                      title="Log new activity"
                    >
                      <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-[#294998]" />
                      <span>Log</span>
                    </button>
                    {lead.source &&
                      String(lead.source).trim() !== "" &&
                      lead.source !== "N/A" && (
                        <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                          {lead.source}
                        </span>
                      )}
                  </div>
                </td>
              );
            case "course_name":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border ${getCourseClasses(
                      lead.course_name
                    )}`}
                    title={lead.course_name}
                  >
                    {lead.course_name && lead.course_name !== "null"
                      ? lead.course_name
                      : "N/A"}
                  </span>
                </td>
              );
            case "course_duration":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <TextCommitInput
                    initialValue={lead.course_duration}
                    onCommit={(val) => {
                      const leadId = lead.id || lead._id;
                      onCourseDurationChange(leadId, val);
                    }}
                  />
                </td>
              );
            case "shift":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[160px]"
                >
                  <TextCommitInput
                    initialValue={lead.shift || ""}
                    onCommit={(val) => {
                      const leadId = lead.id || lead._id;
                      if (typeof onShiftChange === "function") {
                        onShiftChange(leadId, val);
                      }
                    }}
                    // override default input sizing via className prop
                  />
                </td>
              );


            case "assigned_to":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[160px]"
                >
                  {lead._usersLoading ? (
                    <div className="mt-1 p-1 text-sm">Loading users...</div>
                  ) : (
                    <select
                      value={
                        lead.assigned_to_username || lead.assigned_to || ""
                      }
                      onChange={(e) =>
                        onAssignedToChange(lead.id || lead._id, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm font-semibold focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">
                        {Array.isArray(lead._users) && lead._users.length > 0
                          ? "(Unassigned)"
                          : "(No users available)"}
                      </option>
                      {Array.isArray(lead._users) &&
                        lead._users.map((u) => (
                          <option
                            key={u.username || u.id}
                            value={u.username || u.id}
                          >
                            {u.username || u.name || String(u.id)}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
              );
            case "last_call":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <input
                    type="date"
                    value={lead.last_call ? lead.last_call.split("T")[0] : ""}
                    onChange={(e) =>
                      onLastCallChange(lead.id || lead._id, e.target.value)
                    }
                    className="block w-full p-1 border rounded-md shadow-sm text-xs font-semibold"
                  />
                </td>
              );
            case "next_call":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <input
                    type="date"
                    value={lead.next_call ? lead.next_call.split("T")[0] : ""}
                    onChange={(e) =>
                      onNextCallChange(lead.id || lead._id, e.target.value)
                    }
                    className="block w-full p-1 border rounded-md shadow-sm text-xs font-semibold"
                  />
                </td>
              );
            case "status":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm min-w-[140px]"
                >
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      onStatusChange(lead.id || lead._id, e.target.value)
                    }
                    className={`block w-full p-1 border rounded-md shadow-sm text-xs font-semibold focus:ring-blue-500 focus:border-blue-500 appearance-none pr-6 ${getStatusClasses(
                      lead.status
                    )}`}
                  >
                    {["Active", "Converted", "Lost"].map((option) => (
                      <option
                        key={option}
                        value={option}
                        className={getStatusClasses(option)}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
              );

            case "remarks": {
              const leadKey = lead.id || lead._id;
              const newRemark = localRemarks[lead._id] || "";
              const canShowToggle = remarkLines.length > 1;
              const handleAddRemark = () => {
                const trimmed = (newRemark || "").trim();
                if (!trimmed) return;
                const updated = [trimmed, ...remarkLines]
                  .slice(0, 5)
                  .join("\n");
                // Clear input immediately for UX; saved copy will sync via event
                setLocalRemarks((prev) => ({ ...prev, [lead._id]: "" }));
                onRemarkChange(leadKey, updated);
              };
              return (
                <td
                  key={key}
                  className="px-3 py-4 text-sm text-gray-700 min-w-[320px]"
                >
                  {/* Existing remarks list */}
                  <div className="space-y-1 mb-2">
                    {visibleLines.length === 0 ? (
                      <p className="text-gray-400 italic">No remarks yet</p>
                    ) : (
                      visibleLines.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#294998]" />
                          <span className="text-gray-800 break-words">
                            {line}
                          </span>
                        </div>
                      ))
                    )}
                    {canShowToggle && (
                      <button
                        type="button"
                        className="text-[#294998] text-xs hover:underline"
                        onClick={() => setShowAllRemarks((v) => !v)}
                      >
                        {showAllRemarks
                          ? "Show less"
                          : `Show more (${remarkLines.length})`}
                      </button>
                    )}
                  </div>

                  {/* Add new remark */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newRemark}
                      onChange={(e) => handleLocalRemarkChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRemark();
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#294998] focus:border-[#294998]"
                      placeholder="Add a remark and press Enter"
                    />
                    <button
                      type="button"
                      onClick={handleAddRemark}
                      className="px-3 py-2 text-xs font-medium text-white bg-[#294998] hover:bg-[#1E3776] rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </td>
              );
            }
            case "change_log":
              return (
                <td key={key} className="px-3 py-4 text-sm text-gray-700">
                  <LeadLogDisplay
                    // Use backend id when available so the logs endpoint receives
                    // the expected primary key. Fall back to _id otherwise.
                    leadId={lead.id || lead._id}
                    authToken={authToken}
                    changeLogService={changeLogService}
                    // Use savedRemarks (server-confirmed) so logs refresh only
                    // after the remark has been saved and acknowledged.
                    refreshKey={`${lead.status}|${
                      (savedRemarks && savedRemarks[lead._id]) || lead.remarks
                    }|${lead.last_call}|${lead.next_call}|${lead.age}|${
                      lead.grade
                    }`}
                  />
                </td>
              );
            case "actions":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium"
                >
                  <button
                    onClick={() =>
                      onOpenActivityModal && onOpenActivityModal(lead)
                    }
                    className="text-[#294998] hover:text-[#1E3776] mr-2 p-1 rounded-md hover:bg-[#EDF2FC] cursor-pointer"
                    title="Activity View"
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                  </button>
                  {lead.status !== "enrolled" && lead.status !== "Enrolled" ? (
                    <button
                      onClick={() => onOpenEnrollModal && onOpenEnrollModal(lead)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-md transition-colors mr-2 cursor-pointer shadow-xs"
                      title="Convert Lead to Client"
                    >
                      <AcademicCapIcon className="h-4 w-4 text-emerald-600" />
                      <span>Convert</span>
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mr-2"
                      title="Converted to Client"
                    >
                      Client
                    </span>
                  )}
                  <button
                    onClick={() => handleEdit(lead)}
                    className="text-[#294998] hover:text-[#1E3776] mr-2 p-1 rounded-md hover:bg-[#EDF2FC]"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(lead._id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              );
            default:
              // Generic renderer: look up the value on the lead object using
              // common variants (snake_case and camelCase). This covers
              // dynamically toggled columns where a specific case isn't
              // implemented above.
              const getFieldValue = (obj, key) => {
                if (!obj) return "";
                // direct key (snake_case)
                if (obj[key] !== undefined && obj[key] !== null)
                  return obj[key];
                // camelCase fallback
                const camel = key.replace(/_([a-z])/g, (m, p1) =>
                  p1.toUpperCase()
                );
                if (obj[camel] !== undefined && obj[camel] !== null)
                  return obj[camel];
                // also try variants without underscore (e.g., substatus)
                const compact = key.replace(/_/g, "");
                if (obj[compact] !== undefined && obj[compact] !== null)
                  return obj[compact];
                return "";
              };

              const cellValue = getFieldValue(lead, key);
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {cellValue === undefined ||
                  cellValue === null ||
                  String(cellValue).trim() === ""
                    ? "N/A"
                    : cellValue}
                </td>
              );
          }
        };

        return renderCell();
      })}
    </tr>
  );
};

export default DraggableRow;

// Small helper: numeric (or empty) input that commits on blur or Enter
const AgeGradeInput = ({ initialValue, onCommit }) => {
  const [text, setText] = useState(
    initialValue === null || initialValue === undefined
      ? ""
      : String(initialValue)
  );

  useEffect(() => {
    setText(
      initialValue === null || initialValue === undefined
        ? ""
        : String(initialValue)
    );
  }, [initialValue]);

  const commit = () => {
    // send empty string for cleared value (backend expects blank string, not null)
    const payload = text === "" ? "" : text;
    onCommit(payload);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d*$/.test(v)) setText(v);
      }}
      onBlur={commit}
      onKeyDown={handleKey}
      className="block w-full p-1 border border-gray-300 rounded-md shadow-sm text-xs font-semibold focus:ring-blue-500 focus:border-blue-500"
    />
  );
};

// Generic text input commit-on-blur/Enter
const TextCommitInput = ({ initialValue, onCommit }) => {
  const [text, setText] = useState(initialValue || "");

  useEffect(() => {
    setText(initialValue || "");
  }, [initialValue]);

  const commit = () => onCommit(text);
  const handleKey = (e) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      className="block w-full p-1 border border-gray-300 rounded-md shadow-sm text-xs font-semibold focus:ring-blue-500 focus:border-blue-500"
    />
  );
};
