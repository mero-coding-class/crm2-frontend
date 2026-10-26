// src/pages/Reports.jsx — connected to crm2-backend /api/reports/*
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { reportService } from "../services/api";
import {
  BarChart2,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Activity,
  ClipboardList,
  Building2,
  FileText,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());

// ─── Sub-components ───────────────────────────────────────────────────────────
const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm";

const SectionTitle = ({ title, description, titleId }) => (
  <div className="mb-4">
    <h2 id={titleId} className="text-sm font-semibold text-slate-900">{title}</h2>
    {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
  </div>
);

const MetricCard = ({ title, value, sub, icon: Icon }) => (
  <div className={`${panelClass} flex min-w-0 items-start gap-3 p-4 sm:p-5`}>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EDF2FC] text-[#294998]">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  </div>
);

const FunnelRow = ({ label, count, max }) => (
  <div className="grid grid-cols-[minmax(90px,150px)_1fr_40px] items-center gap-3 py-2">
    <span className="truncate text-xs text-slate-600" title={label || "—"}>{label || "—"}</span>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#294998] transition-[width] duration-300"
        style={{ width: max > 0 ? `${Math.min(100, (count / max) * 100)}%` : "0%" }}
      />
    </div>
    <span className="text-right text-xs font-semibold text-slate-700 tabular-nums">{fmt(count)}</span>
  </div>
);

const ExportBtn = ({ label, loading, onClick }) => (
  <button
    onClick={onClick}
    disabled={loading}
    aria-label={`Download ${label} export`}
    className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
      label === "CSV"
        ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        : "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50"
    }`}
  >
    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
    {label}
  </button>
);

const datasetOptions = [
  { name: "leads", icon: Users, detail: "Lead records" },
  { name: "activities", icon: Activity, detail: "Interaction history" },
  { name: "tasks", icon: ClipboardList, detail: "Team follow-ups" },
  { name: "clients", icon: Building2, detail: "Client records" },
  { name: "contracts", icon: FileText, detail: "Contract records" },
];

const ExportCard = ({ icon: Icon, title, description, eyebrow, children }) => (
  <article className="group flex min-h-[176px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
    <div className="flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF2FC] text-[#294998] ring-1 ring-[#CDDBF6]/70">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-400">{eyebrow}</p>}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <span className="text-[11px] font-medium text-slate-400">Export format</span>
      <div className="flex gap-2">{children}</div>
    </div>
  </article>
);

const StatTile = ({ label, value, tone = "default" }) => {
  const toneClasses = {
    default: "text-slate-900",
    success: "text-emerald-700",
    danger: "text-rose-700",
  };
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className={`text-2xl font-semibold tracking-tight tabular-nums ${toneClasses[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Reports = () => {
  const { authToken, user } = useAuth();
  const isAdmin = ["admin", "superadmin"].includes((user?.role || "").toLowerCase());

  // ── Filters ────────────────────────────────────────────────────────────────
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [district, setDistrict] = useState("");

  // ── Data ───────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Export ─────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState({});

  // ── Fetch Summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    if (!authToken) return;
    if (from && to && from > to) {
      setError("From date must be on or before To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (district) params.district = district;
      const data = await reportService.getSummary(authToken, params);
      setSummary(data);
    } catch (e) {
      setError(e.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [authToken, from, to, district]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const handleExportSummary = async (fmt_) => {
    if (from && to && from > to) {
      setError("From date must be on or before To date.");
      return;
    }
    const key = `summary-${fmt_}`;
    setExporting((e) => ({ ...e, [key]: true }));
    try {
      const params = { export: fmt_ };
      if (from) params.from = from;
      if (to) params.to = to;
      if (district) params.district = district;
      const blob = await reportService.getSummary(authToken, params);
      reportService.downloadBlob(blob, `summary.${fmt_}`);
    } catch (e) {
      alert("Export failed: " + (e.message || "Unknown error"));
    } finally {
      setExporting((e) => ({ ...e, [key]: false }));
    }
  };

  const handleExportLeads = async (fmt_) => {
    if (from && to && from > to) {
      setError("From date must be on or before To date.");
      return;
    }
    const key = `leads-${fmt_}`;
    setExporting((e) => ({ ...e, [key]: true }));
    try {
      const params = { export: fmt_ };
      if (from) params.from = from;
      if (to) params.to = to;
      if (district) params.district = district;
      const blob = await reportService.getLeadRows(authToken, params);
      reportService.downloadBlob(blob, `leads.${fmt_}`);
    } catch (e) {
      alert("Export failed: " + (e.message || "Unknown error"));
    } finally {
      setExporting((e) => ({ ...e, [key]: false }));
    }
  };

  const handleExportDataset = async (dataset, fmt_) => {
    if (from && to && from > to) {
      setError("From date must be on or before To date.");
      return;
    }
    const key = `${dataset}-${fmt_}`;
    setExporting((e) => ({ ...e, [key]: true }));
    try {
      const blob = await reportService.exportDataset(authToken, dataset, fmt_);
      reportService.downloadBlob(blob, `${dataset}.${fmt_}`);
    } catch (e) {
      alert("Export failed: " + (e.message || "Unknown error"));
    } finally {
      setExporting((e) => ({ ...e, [key]: false }));
    }
  };

  // ── Funnel max ─────────────────────────────────────────────────────────────
  const funnelMax = summary?.funnel?.reduce((m, f) => Math.max(m, f.count), 0) || 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              {summary?.scope === "all" ? "All team data" : "Your assigned data"} · Report overview and exports
            </p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {/* Filters */}
        <section className={`${panelClass} p-4 sm:p-5`} aria-labelledby="report-filters-title">
          <SectionTitle
            title="Filters"
            titleId="report-filters-title"
            description="Narrow the report by date or district."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="report-from" className="mb-1.5 block text-xs font-medium text-slate-600">From date</label>
              <input
                id="report-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1.5 block text-xs font-medium text-slate-600">To date</label>
              <input
                id="report-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15"
              />
            </div>
            <div>
              <label htmlFor="report-district" className="mb-1.5 block text-xs font-medium text-slate-600">District</label>
              <input
                id="report-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Filter by district"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15"
              />
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !summary && (
          <div className={`${panelClass} flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500`}>
            <Loader2 className="h-5 w-5 animate-spin text-[#294998]" aria-hidden="true" /> Loading report…
          </div>
        )}

        {summary && (
          <>
            {/* Key Metrics */}
            <section aria-labelledby="report-metrics-title">
              <h2 id="report-metrics-title" className="mb-3 text-sm font-semibold text-slate-900">Key metrics</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Pipeline Value"
                  value={`Rs ${fmt(summary.pipeline_value)}`}
                  sub="Active contract value"
                  icon={TrendingUp}
                />
                <MetricCard
                  title="Conversions"
                  value={fmt(summary.conversions?.count)}
                  sub="Leads enrolled in period"
                  icon={CheckCircle2}
                />
                <MetricCard
                  title="Proposals Sent"
                  value={fmt(summary.proposals_sent)}
                  sub="Activities with Proposal sent"
                  icon={Users}
                />
                <MetricCard
                  title="Renewals Due (60d)"
                  value={fmt(summary.renewals_due_60d)}
                  sub="Active contracts expiring soon"
                  icon={BarChart2}
                />
              </div>
            </section>

            {/* Demos */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <section className={`${panelClass} p-4 sm:p-5`}>
                <SectionTitle title="Demo stats" />
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Scheduled" value={fmt(summary.demos?.scheduled)} />
                  <StatTile label="Completed" value={fmt(summary.demos?.completed)} tone="success" />
                </div>
              </section>

              {/* Transitions */}
              <section className={`${panelClass} p-4 sm:p-5`}>
                <SectionTitle title="Status transitions" />
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Won · Enrolled" value={fmt(summary.transitions?.won)} tone="success" />
                  <StatTile label="Lost · Not interested" value={fmt(summary.transitions?.lost)} tone="danger" />
                </div>
              </section>
            </div>

            {/* Funnel */}
            {summary.funnel?.length > 0 && (
              <section className={`${panelClass} p-4 sm:p-5`}>
                <SectionTitle title="Lead funnel" description="Active leads by current status." />
                <div className="divide-y divide-slate-100">
                  {summary.funnel.map((f) => (
                    <FunnelRow key={f.sub_status} label={f.sub_status} count={f.count} max={funnelMax} />
                  ))}
                </div>
                {summary.on_hold_excluded > 0 && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {fmt(summary.on_hold_excluded)} on-hold leads are excluded from pipeline value.
                  </p>
                )}
              </section>
            )}

            {/* Activities by type */}
            {summary.activities_by_type?.length > 0 && (
              <section className={`${panelClass} p-4 sm:p-5`}>
                <SectionTitle title="Activities by type" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {summary.activities_by_type.map((a) => (
                    <div key={a.type} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                      <div className="text-xl font-semibold text-slate-900 tabular-nums">{fmt(a.count)}</div>
                      <div className="mt-1 truncate text-xs text-slate-500" title={a.type}>{a.type}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Conversions by rep */}
            {summary.conversions?.by_converter?.length > 0 && (
              <section className={`${panelClass} overflow-hidden`}>
                <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle title="Conversions by rep" /></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/70">
                        <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Representative</th>
                        <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Conversions</th>
                        <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.conversions.by_converter.map((c) => (
                        <tr key={c.mcc_rep_name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-slate-700">{c.mcc_rep_name || "—"}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 tabular-nums">{fmt(c.count)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">Rs {fmt(c.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Export center */}
            <section className="space-y-4" aria-labelledby="report-exports-title">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="report-exports-title" className="text-base font-semibold tracking-tight text-slate-900">Export center</h2>
                  <p className="mt-1 text-xs text-slate-500">Download reports and data in the format you need.</p>
                </div>
                <span className="text-xs text-slate-400">CSV and Excel files</span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ExportCard
                  icon={BarChart2}
                  eyebrow="Reports"
                  title="Summary report"
                  description="Key metrics and totals. Uses the current date and district filters."
                >
                  <ExportBtn label="CSV" loading={exporting["summary-csv"]} onClick={() => handleExportSummary("csv")} />
                  <ExportBtn label="Excel" loading={exporting["summary-xlsx"]} onClick={() => handleExportSummary("xlsx")} />
                </ExportCard>

                <ExportCard
                  icon={Users}
                  eyebrow="Filtered results"
                  title="Lead rows"
                  description="Filtered leads and their details, based on the filters above."
                >
                  <ExportBtn label="CSV" loading={exporting["leads-csv"]} onClick={() => handleExportLeads("csv")} />
                  <ExportBtn label="Excel" loading={exporting["leads-xlsx"]} onClick={() => handleExportLeads("xlsx")} />
                </ExportCard>
              </div>

              {isAdmin && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                        <Database className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Full datasets</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Admin data exports across all records.</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">5 datasets</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {datasetOptions.map(({ name, icon: Icon, detail }) => (
                      <article key={name} className="flex min-w-0 flex-col rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold capitalize text-slate-800">{name}</h4>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">{detail} · All records</p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                          <ExportBtn label="CSV" loading={exporting[`${name}-csv`]} onClick={() => handleExportDataset(name, "csv")} />
                          <ExportBtn label="XLS" loading={exporting[`${name}-xlsx`]} onClick={() => handleExportDataset(name, "xlsx")} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
