import React from "react";
import { X } from "lucide-react";
import useModalScrollLock from "../../hooks/useModalScrollLock.js";

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
};

export default function ReadOnlyRecordModal({
  title,
  subtitle,
  sections = [],
  loading = false,
  error = "",
  onClose,
}) {
  useModalScrollLock(true);

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="record-details-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="record-details-title" className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading record details…</p>}
          {!loading && error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {!loading && !error && sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{section.title}</h3>
              <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                {section.fields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                    <dd className="mt-1 break-words text-sm text-slate-800">{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-400">Read-only record details</footer>
      </section>
    </div>
  );
}
