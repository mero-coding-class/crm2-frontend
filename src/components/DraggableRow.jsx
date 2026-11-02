import React from "react";
import {
  GraduationCap as AcademicCapIcon,
  ClipboardList as ClipboardDocumentListIcon,
  Eye as EyeIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
} from "lucide-react";
import { getSubStatusClasses } from "./helpers";

const formatValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
};

const DraggableRow = ({
  lead,
  columns,
  columnOrder,
  selected,
  onSelect,
  handleEdit,
  handleDelete,
  canManageLeads,
  isAdmin,
  onOpenActivityModal,
  onOpenViewModal,
  onOpenDetailsModal,
  onOpenEnrollModal,
}) => {
  const cell = (key) => {
    switch (key) {
      case "approval": {
        const pending = lead.approval === "pending";
        const approved = lead.approval === "approved";
        const label = pending ? "Pending" : approved ? "Approved" : "Unknown";
        const classes = pending
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : approved
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500";
        return <td key={key} className="whitespace-nowrap px-3 py-3 text-sm"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span></td>;
      }
      case "school_name":
        return <td key={key} className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
          <button type="button" onClick={() => onOpenDetailsModal?.(lead)} className="text-left hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={`View details for ${lead.school_name || "lead"}`}>
            {formatValue(lead.school_name)}
          </button>
        </td>;
      case "municipality":
        return <td key={key} className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">{formatValue(lead.municipality)}</td>;
      case "contact_person":
        return <td key={key} className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">{formatValue(lead.contact_person)}</td>;
      case "contact_number":
        return <td key={key} className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">{formatValue(lead.contact_number)}</td>;
      case "sub_status":
        return (
          <td key={key} className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${getSubStatusClasses(lead.sub_status)}`}>
                {formatValue(lead.sub_status || "New")}
              </span>
              <button
                type="button"
                title="View Activity Log"
                onClick={() => onOpenViewModal?.(lead)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-primary-light hover:text-primary"
              >
                <EyeIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        );
      case "actions": {
        const canLogActivity = isAdmin || lead.approval !== "pending";
        const canConvert = lead.approval === "approved";
        return (
          <td key={key} className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium">
            <div className="flex items-center justify-end gap-1">
              {canLogActivity && <button type="button" onClick={() => onOpenActivityModal?.(lead)} className="inline-flex items-center gap-1 rounded-md border border-primary-border bg-primary-light px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-light" title="Log activity">
                <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Log
              </button>}
              {canManageLeads && (
                <>
                  {canConvert && <button type="button" onClick={() => onOpenEnrollModal?.(lead)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" title="Convert lead to client">
                    <AcademicCapIcon className="h-3.5 w-3.5" /> Convert
                  </button>}
                  <button type="button" onClick={() => handleEdit(lead)} className="rounded-md p-1 text-primary hover:bg-primary-light" title="Edit lead">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(lead.id || lead._id)} className="rounded-md p-1 text-rose-600 hover:bg-rose-50" title="Move lead to Archive">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </td>
        );
      }
      default:
        return <td key={key} className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{formatValue(lead[key])}</td>;
    }
  };

  const visibleColumns = columnOrder || Object.keys(columns || {}).filter((key) => columns[key]?.visible);

  return (
    <tr className={`transition-colors hover:bg-slate-50/80 ${selected ? "bg-primary-light/60" : ""}`}>
      <td className="w-10 whitespace-nowrap px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(lead._id || lead.id)}
          aria-label={`Select ${lead.school_name || "lead"}`}
          className="h-3.5 w-3.5 cursor-pointer rounded-[4px] border-slate-300 text-primary focus:ring-primary"
        />
      </td>
      {visibleColumns.map(cell)}
    </tr>
  );
};

export default DraggableRow;
