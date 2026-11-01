import React, { useEffect, useState } from "react";
import { Undo2 as ArrowUturnLeftIcon } from "lucide-react";
import DataTableShell from "./common/DataTableShell.jsx";
import Pagination from "./common/Pagination.jsx";
import { Button } from "./ui/button.jsx";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const TrashDisplayTable = ({
  leads = [],
  canRestore = false,
  onRestoreLead,
  onBulkRestore,
  busy = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => setSelectedIds(new Set()), [leads]);

  const allSelected = leads.length > 0 && leads.every((lead) => selectedIds.has(lead.id));
  const toggleSelected = (id) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((lead) => lead.id)));
  };

  return (
    <DataTableShell
      minWidth="100%"
      pagination={(
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} disabled={busy} />
      )}
    >
      {canRestore && selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
          <Button
            variant="restore"
            size="sm"
            type="button"
            disabled={busy}
            onClick={() => {
              onBulkRestore([...selectedIds]);
              setSelectedIds(new Set());
            }}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" /> Restore selected
          </Button>
        </div>
      )}

      <div className="crm-data-table__scroll">
        <table className="divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {canRestore && (
                <th className="w-10 px-3 py-3 text-center">
                  <input type="checkbox" checked={allSelected} onChange={handleSelectAll} aria-label="Select all archived leads" />
                </th>
              )}
              {["System ID", "School", "District", "Municipality", "Contact", "Phone", "Archived", "Reason"].map((label) => (
                <th key={label} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>
              ))}
              {canRestore && <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {leads.length === 0 ? (
              <tr><td colSpan={canRestore ? 10 : 8} className="px-4 py-12 text-center text-sm text-slate-500">No archived leads found.</td></tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                {canRestore && (
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelected(lead.id)} aria-label={`Select ${lead.school_name}`} />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-3 text-xs font-mono text-slate-500">{lead.system_id || lead.id}</td>
                <td className="min-w-[180px] px-3 py-3 text-sm font-medium text-slate-900">{lead.school_name || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{lead.district || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{lead.municipality || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{lead.contact_person || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{lead.contact_number || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-500">{formatDate(lead.updated_at)}</td>
                <td className="max-w-[260px] px-3 py-3 text-sm text-slate-700">{lead.archive_reason || "—"}</td>
                {canRestore && (
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <Button type="button" variant="restore" size="sm" disabled={busy} onClick={() => onRestoreLead(lead.id)}>
                      <ArrowUturnLeftIcon className="h-3.5 w-3.5" /> Restore
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </DataTableShell>
  );
};

export default TrashDisplayTable;
