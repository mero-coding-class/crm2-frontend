// src/components/DraggableRow.jsx
import React, { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bars3Icon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
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
      className={`hover:bg-gray-50 ${
        isDragging ? "bg-gray-100 shadow-lg" : ""
      }`}
    >
      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <Bars3Icon className="h-5 w-5 text-gray-400" />
        </button>
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(lead._id)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>

      {/* Dynamic Column Rendering - no changes needed here */}
      {(columnOrder || Object.keys(columns)).map((key) => {
        // support older prop shapes: if columnOrder not provided, skip invisible
        if (!columnOrder && !columns[key].visible) return null;

        const renderCell = () => {
          switch (key) {
            case "school_college_name":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                >
                  {lead.school_college_name && String(lead.school_college_name).trim() !== ""
                    ? lead.school_college_name
                    : lead.student_name || "N/A"}
                </td>
              );
            case "address_line_1":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.address_line_1 && String(lead.address_line_1).trim() !== ""
                    ? lead.address_line_1
                    : lead.city || "N/A"}
                </td>
              );
            case "scheduled_taken": {
              const value =
                (lead.scheduled_taken || lead.demo_scheduled || "No") === "Yes"
                  ? "Yes"
                  : "No";
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[120px]"
                >
                  <select
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (typeof onDemoScheduledChange === "function") {
                        onDemoScheduledChange(lead.id || lead._id, v);
                      }
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm font-semibold"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
              );
            }
            case "course_type":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[120px]"
                >
                  <select
                    value={lead.course_type || ""}
                    onChange={(e) => {
                      if (typeof onCourseTypeChange === "function") {
                        onCourseTypeChange(lead.id || lead._id, e.target.value);
                      }
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm font-semibold"
                  >
                    <option value="">Select</option>
                    {["Physical", "Online"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              );
            case "class_type":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[120px]"
                >
                  <select
                    value={lead.class_type || ""}
                    onChange={(e) => {
                      if (typeof onClassTypeChange === "function") {
                        onClassTypeChange(lead.id || lead._id, e.target.value);
                      }
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm font-semibold"
                  >
                    <option value="">Select</option>
                    {["One to One", "Group"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              );
            case "substatus":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-lg border shadow-sm ${getSubStatusClasses(
                      lead.substatus || lead.sub_status
                    )}`}
                  >
                    <select
                      value={lead.substatus || lead.sub_status || "New"}
                      onChange={(e) => {
                        // Update frontend state and backend. Prefer backend id.
                        if (onSubStatusChange) {
                          onSubStatusChange(
                            lead.id || lead._id,
                            e.target.value
                          );
                        }
                      }}
                      className="bg-transparent border-0 p-0 m-0 text-sm font-semibold appearance-none focus:outline-none text-current"
                    >
                      {[
                        "New",
                        "Open",
                        "Followup",
                        "inProgress",
                        "Average",
                        "Interested",
                        "Junk",
                        "NextBatch",
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              );
            /* assigned_to is rendered later (single, canonical case). */
            case "phone_number":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.phone_number && String(lead.phone_number).trim() !== ""
                    ? lead.phone_number
                    : "N/A"}
                </td>
              );
            case "whatsapp_number":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.whatsapp_number &&
                  String(lead.whatsapp_number).trim() !== ""
                    ? lead.whatsapp_number
                    : "N/A"}
                </td>
              );
            // ... inside renderCell for "age":
            case "age":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {/* local state to avoid triggering parent update on every keystroke */}
                  <AgeGradeInput
                    initialValue={lead.age}
                    onCommit={(val) => {
                      const leadId = lead.id || lead._id;
                      onAgeChange(leadId, val);
                    }}
                  />
                </td>
              );

            // ... same for "grade":
            case "grade":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  <AgeGradeInput
                    initialValue={lead.grade}
                    onCommit={(val) => {
                      const leadId = lead.id || lead._id;
                      onGradeChange(leadId, val);
                    }}
                  />
                </td>
              );
            case "source":
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {lead.source && String(lead.source).trim() !== ""
                    ? lead.source
                    : "N/A"}
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

            case "demo_scheduled":
              // Legacy support: render same as scheduled_taken
              return (
                <td
                  key={key}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 min-w-[120px]"
                >
                  <select
                    value={
                      (lead.scheduled_taken || lead.demo_scheduled || "No") ===
                      "Yes"
                        ? "Yes"
                        : "No"
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (typeof onDemoScheduledChange === "function") {
                        onDemoScheduledChange(lead.id || lead._id, v);
                      }
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm font-semibold"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
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
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />
                          <span className="text-gray-800 break-words">
                            {line}
                          </span>
                        </div>
                      ))
                    )}
                    {canShowToggle && (
                      <button
                        type="button"
                        className="text-indigo-600 text-xs hover:underline"
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
                      className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Add a remark and press Enter"
                    />
                    <button
                      type="button"
                      onClick={handleAddRemark}
                      className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
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
                    onClick={() => handleEdit(lead)}
                    className="text-indigo-600 hover:text-indigo-900 mr-2 p-1 rounded-md hover:bg-indigo-50"
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
