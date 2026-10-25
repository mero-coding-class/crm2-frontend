import React, { useMemo, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { importService } from "../services/api";

const STATUS_LABELS = {
  valid: "Ready",
  invalid: "Invalid",
  duplicate_in_file: "Duplicate in file",
  duplicate_in_db: "Already exists",
};

const ImportCsvButton = ({
  authToken,
  id = "csvUpload",
  customButton,
  className = "",
}) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileName, setFileName] = useState("");

  const validRows = useMemo(
    () => (preview?.rows || []).filter((row) => row.status === "valid"),
    [preview]
  );

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setSelectedRows(new Set());
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await importService.preview(file, authToken);
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      setPreview({ ...result, rows });
      setSelectedRows(new Set(rows.filter((row) => row.status === "valid").map((row) => row.index)));
    } catch (previewError) {
      setError(previewError.message || "Could not preview this file.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.batch_key || selectedRows.size === 0 || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await importService.confirm(
        preview.batch_key,
        [...selectedRows],
        authToken
      );
      const createdCount = (result?.results || []).filter((row) => row.result === "created").length;
      const skippedCount = (result?.results || []).length - createdCount;
      setNotice(
        `${createdCount} lead${createdCount === 1 ? "" : "s"} imported${skippedCount ? `; ${skippedCount} skipped` : ""}.`
      );
      setPreview(null);
      setSelectedRows(new Set());
      window.dispatchEvent(new CustomEvent("crm:imported", { detail: { count: createdCount } }));
    } catch (confirmError) {
      setError(confirmError.message || "Could not import the selected leads.");
    } finally {
      setBusy(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setSelectedRows(new Set());
    setError("");
  };

  const toggleRow = (index) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const allValidSelected = validRows.length > 0 && validRows.every((row) => selectedRows.has(row.index));

  return (
    <div className="relative inline-flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileChange}
        className="hidden"
        id={id}
        disabled={busy}
      />
      <label
        htmlFor={id}
        className={`cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""} ${className}`}
      >
        {customButton || (
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-[#EEF2F6] px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200">
            <FileUp className="h-4 w-4" /> Import CSV / Excel
          </span>
        )}
      </label>

      {busy && <p className="mt-2 text-xs text-slate-500">{preview ? "Importing selected leads…" : "Preparing file preview…"}</p>}
      {fileName && !preview && !busy && !notice && <p className="mt-2 text-xs text-slate-500">{fileName}</p>}
      {error && <p role="alert" className="mt-2 max-w-xl text-xs text-rose-700">{error}</p>}
      {notice && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          {notice}
          <button type="button" onClick={() => setNotice("")} className="underline">Dismiss</button>
        </p>
      )}

      {preview && (
        <section className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,900px)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Review import: {preview.filename || fileName}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {preview.total_rows ?? preview.rows.length} rows · {selectedRows.size} ready to import
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={closePreview} disabled={busy} className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleConfirm} disabled={busy || selectedRows.size === 0} className="rounded bg-[#294998] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {busy ? "Importing…" : `Import ${selectedRows.size}`}
              </button>
            </div>
          </header>

          <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            {Object.entries(preview.summary || {}).map(([status, count]) => (
              <span key={status} className="rounded-full bg-slate-100 px-2 py-1">{STATUS_LABELS[status] || status}: {count}</span>
            ))}
          </div>

          <div className="max-h-[50vh] overflow-auto rounded border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-2"><input type="checkbox" aria-label="Select all valid rows" checked={allValidSelected} onChange={() => setSelectedRows(allValidSelected ? new Set() : new Set(validRows.map((row) => row.index)))} /></th>
                  <th className="px-2 py-2">School</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">District</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((row) => {
                  const data = row.data || {};
                  const canSelect = row.status === "valid";
                  const reasons = Object.values(row.errors || {}).flat().join("; ");
                  return (
                    <tr key={row.index} className={canSelect ? "" : "bg-slate-50 text-slate-500"}>
                      <td className="px-2 py-2"><input type="checkbox" checked={selectedRows.has(row.index)} disabled={!canSelect} onChange={() => toggleRow(row.index)} aria-label={`Select row ${row.index + 1}`} /></td>
                      <td className="max-w-[200px] truncate px-2 py-2">{data.school_name || "—"}</td>
                      <td className="px-2 py-2">{data.contact_person || "—"}</td>
                      <td className="px-2 py-2">{data.district || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2">{STATUS_LABELS[row.status] || row.status}</td>
                      <td className="max-w-[280px] px-2 py-2">{reasons || data.email || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default ImportCsvButton;
