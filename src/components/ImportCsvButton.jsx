import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, LoaderCircle, X } from "lucide-react";
import { importService } from "../services/api";

const STATUS_LABELS = {
  valid: "Ready",
  invalid: "Invalid",
  duplicate_in_file: "Duplicate in file",
  duplicate_in_db: "Already exists",
};
const PREVIEW_PAGE_SIZE = 100;
const formatCount = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

const REQUIRED_COLUMNS = [
  { name: "school_name", aliases: "school, school name", sample: "Shree Machindra School" },
  { name: "district", aliases: "—", sample: "Kathmandu" },
  { name: "municipality", aliases: "municipality name, mun", sample: "Kirtipur" },
  { name: "address", aliases: "—", sample: "Kirtipur-5" },
  { name: "contact_person", aliases: "contact person, contact name, contact", sample: "Ram Thapa" },
  { name: "contact_number", aliases: "contact number, phone, mobile, phone number, mobile number", sample: "9851000001" },
  { name: "email", aliases: "e-mail, email address", sample: "contact@school.edu.np" },
];
const OPTIONAL_COLUMNS = [
  { name: "alt_number", aliases: "alt number, alt phone" },
  { name: "alt_contact_person", aliases: "alt contact person" },
  { name: "source", aliases: "—" },
  { name: "course_interest", aliases: "course interest, course" },
  { name: "social_media", aliases: "social media, social, facebook" },
];

const ImportCsvButton = ({
  authToken,
  id = "csvUpload",
  customButton,
  className = "",
}) => {
  const inputRef = useRef(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileName, setFileName] = useState("");

  const validRows = useMemo(
    () => (preview?.rows || []).filter((row) => row.status === "valid"),
    [preview]
  );
  const previewPageCount = Math.max(
    1,
    Math.ceil((preview?.rows?.length || 0) / PREVIEW_PAGE_SIZE)
  );
  const visibleRows = useMemo(() => {
    const rows = preview?.rows || [];
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return rows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [preview, previewPage]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setPreviewPage(1);
    setSelectedRows(new Set());
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await importService.preview(file, authToken);
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      setPreview({ ...result, rows });
      setPreviewPage(1);
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
    setPreviewPage(1);
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

  const allValidSelected = validRows.length > 0 && selectedRows.size === validRows.length;

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
      <button
        type="button"
        onClick={() => setShowInstructions(true)}
        disabled={busy}
        className={`${busy ? "pointer-events-none opacity-60" : ""} ${className}`}
      >
        {customButton || (
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-surface-muted px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200">
            <FileUp className="h-4 w-4" /> Import CSV / Excel
          </span>
        )}
      </button>

      {fileName && !preview && !busy && !notice && <p className="mt-2 text-xs text-slate-500">{fileName}</p>}
      {error && <p role="alert" className="mt-2 max-w-xl text-xs text-rose-700">{error}</p>}
      {notice && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          {notice}
          <button type="button" onClick={() => setNotice("")} className="underline">Dismiss</button>
        </p>
      )}

      {showInstructions && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-import-instructions-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="lead-import-instructions-title" className="text-base font-semibold text-slate-900">
                  Import leads from a spreadsheet
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Accepted formats: .csv or .xlsx. Column headers are matched case-insensitively,
                  so any of the alias names below works.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Close import instructions"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto px-5 py-4 sm:px-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required columns</h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">Also accepted as</th>
                      <th className="px-3 py-2">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {REQUIRED_COLUMNS.map((col) => (
                      <tr key={col.name}>
                        <td className="px-3 py-2 font-medium text-slate-900">{col.name}</td>
                        <td className="px-3 py-2 text-slate-500">{col.aliases}</td>
                        <td className="px-3 py-2 text-slate-500">{col.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional columns</h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">Also accepted as</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <tr key={col.name}>
                        <td className="px-3 py-2 font-medium text-slate-900">{col.name}</td>
                        <td className="px-3 py-2 text-slate-500">{col.aliases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Rows missing a required column, or matching an existing lead, are flagged in the
                preview step and can be excluded before importing.
              </p>
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowInstructions(false); inputRef.current?.click(); }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
              >
                <FileUp className="h-4 w-4" /> Browse files
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}

      {busy && !preview && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-import-progress-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-primary">
              <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
            </div>
            <h2 id="lead-import-progress-title" className="text-lg font-semibold text-slate-900">
              Preparing file preview
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Checking rows and duplicates in {fileName || "your file"}. This may take a little while for large uploads.
            </p>
          </section>
        </div>,
        document.body
      )}

      {preview && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-import-review-title"
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="lead-import-review-title" className="truncate text-base font-semibold text-slate-900">
                  Review import
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500">{preview.filename || fileName}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {formatCount(preview.total_rows ?? preview.rows.length)} rows · {formatCount(selectedRows.size)} ready to import
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                disabled={busy}
                aria-label="Close import review"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="shrink-0 px-5 pt-4 sm:px-6">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {Object.entries(preview.summary || {}).map(([status, count]) => (
                  <span key={status} className="rounded-full bg-slate-100 px-2.5 py-1">{STATUS_LABELS[status] || status}: {formatCount(count)}</span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
                {busy ? (
                  <span className="inline-flex items-center gap-2 font-medium text-primary" role="status">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Importing selected leads…
                  </span>
                ) : <span />}
                <div className="ml-auto flex items-center gap-2">
                  <span>Preview page {formatCount(previewPage)} of {formatCount(previewPageCount)}</span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                    disabled={busy || previewPage <= 1}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((page) => Math.min(previewPageCount, page + 1))}
                    disabled={busy || previewPage >= previewPageCount}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-3 sm:px-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5"><input type="checkbox" aria-label="Select all valid rows" checked={allValidSelected} disabled={busy} onChange={() => setSelectedRows(allValidSelected ? new Set() : new Set(validRows.map((row) => row.index)))} /></th>
                      <th className="px-3 py-2.5">School</th>
                      <th className="px-3 py-2.5">Contact</th>
                      <th className="px-3 py-2.5">District</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((row) => {
                      const data = row.data || {};
                      const canSelect = row.status === "valid";
                      const reasons = Object.values(row.errors || {}).flat().join("; ");
                      return (
                        <tr key={row.index} className={canSelect ? "" : "bg-slate-50 text-slate-500"}>
                          <td className="px-3 py-2.5"><input type="checkbox" checked={selectedRows.has(row.index)} disabled={!canSelect || busy} onChange={() => toggleRow(row.index)} aria-label={`Select row ${row.index + 1}`} /></td>
                          <td className="max-w-[240px] truncate px-3 py-2.5">{data.school_name || "—"}</td>
                          <td className="px-3 py-2.5">{data.contact_person || "—"}</td>
                          <td className="px-3 py-2.5">{data.district || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">{STATUS_LABELS[row.status] || row.status}</td>
                          <td className="max-w-[320px] px-3 py-2.5">{reasons || data.email || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <button type="button" onClick={closePreview} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleConfirm} disabled={busy || selectedRows.size === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50">
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy ? "Importing…" : `Import ${formatCount(selectedRows.size)}`}
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ImportCsvButton;
