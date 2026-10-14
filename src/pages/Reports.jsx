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
  Download,
  Loader2,
  RefreshCw,
  Filter,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());

// ─── Sub-components ───────────────────────────────────────────────────────────
const MetricCard = ({ title, value, sub, icon: Icon, color }) => (
  <div className={`rounded-[12px] border p-5 bg-white flex items-start gap-4 shadow-sm ${color}`}>
    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-current/10 shrink-0">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-[11px] font-[600] uppercase tracking-wide text-current/70">{title}</div>
      <div className="text-[22px] font-[700] mt-0.5">{value}</div>
      {sub && <div className="text-[11px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const FunnelRow = ({ label, count, max }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="text-[12px] text-slate-600 w-[180px] shrink-0 truncate">{label || "—"}</span>
    <div className="flex-1 bg-slate-100 rounded-full h-2">
      <div
        className="h-2 rounded-full bg-[#4F46E5]"
        style={{ width: max > 0 ? `${Math.min(100, (count / max) * 100)}%` : "0%" }}
      />
    </div>
    <span className="text-[12px] font-[600] text-slate-700 w-8 text-right">{count}</span>
  </div>
);

const ExportBtn = ({ label, loading, onClick }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-[8px] text-[12px] font-[500] text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    {label}
  </button>
);

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
    <div className="flex flex-col min-h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-indigo-50 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-[20px] font-[700] text-slate-900 tracking-[-0.015em]">Reports</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {summary?.scope === "all" ? "All scopes (Admin)" : "Own scope"} — live backend metrics
              </p>
            </div>
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-[12px] border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <h2 className="text-[14px] font-[600] text-slate-700">Filters</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-[600] text-slate-500 mb-1 uppercase tracking-wide">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-[600] text-slate-500 mb-1 uppercase tracking-wide">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-[600] text-slate-500 mb-1 uppercase tracking-wide">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Filter by district"
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-[10px] p-4 text-red-700 text-[13px]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !summary && (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading report…
          </div>
        )}

        {summary && (
          <>
            {/* Key Metrics */}
            <div>
              <h2 className="text-[14px] font-[700] text-slate-700 mb-3">Key Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                  title="Pipeline Value"
                  value={`Rs ${fmt(summary.pipeline_value)}`}
                  sub="Active contract value"
                  icon={TrendingUp}
                  color="text-emerald-600 border-emerald-100"
                />
                <MetricCard
                  title="Conversions"
                  value={fmt(summary.conversions?.count)}
                  sub="Leads enrolled in period"
                  icon={CheckCircle2}
                  color="text-indigo-600 border-indigo-100"
                />
                <MetricCard
                  title="Proposals Sent"
                  value={fmt(summary.proposals_sent)}
                  sub="Activities with Proposal sent"
                  icon={Users}
                  color="text-violet-600 border-violet-100"
                />
                <MetricCard
                  title="Renewals Due (60d)"
                  value={fmt(summary.renewals_due_60d)}
                  sub="Active contracts expiring soon"
                  icon={BarChart2}
                  color="text-amber-600 border-amber-100"
                />
              </div>
            </div>

            {/* Demos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[12px] border border-slate-200 p-5">
                <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Demo Stats</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-[10px] p-4 text-center">
                    <div className="text-[28px] font-[800] text-blue-700">{fmt(summary.demos?.scheduled)}</div>
                    <div className="text-[11px] text-blue-500 font-[600] mt-1">Scheduled</div>
                  </div>
                  <div className="bg-emerald-50 rounded-[10px] p-4 text-center">
                    <div className="text-[28px] font-[800] text-emerald-700">{fmt(summary.demos?.completed)}</div>
                    <div className="text-[11px] text-emerald-500 font-[600] mt-1">Completed</div>
                  </div>
                </div>
              </div>

              {/* Transitions */}
              <div className="bg-white rounded-[12px] border border-slate-200 p-5">
                <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Status Transitions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-[10px] p-4 text-center">
                    <div className="text-[28px] font-[800] text-green-700">{fmt(summary.transitions?.won)}</div>
                    <div className="text-[11px] text-green-500 font-[600] mt-1">Won (Enrolled)</div>
                  </div>
                  <div className="bg-red-50 rounded-[10px] p-4 text-center">
                    <div className="text-[28px] font-[800] text-red-700">{fmt(summary.transitions?.lost)}</div>
                    <div className="text-[11px] text-red-500 font-[600] mt-1">Lost (Not Interested)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Funnel */}
            {summary.funnel?.length > 0 && (
              <div className="bg-white rounded-[12px] border border-slate-200 p-5">
                <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Lead Funnel (Active)</h2>
                <div className="space-y-1">
                  {summary.funnel.map((f) => (
                    <FunnelRow key={f.sub_status} label={f.sub_status} count={f.count} max={funnelMax} />
                  ))}
                </div>
                {summary.on_hold_excluded > 0 && (
                  <p className="text-[11px] text-slate-400 mt-3">
                    * {fmt(summary.on_hold_excluded)} "On hold" leads excluded from pipeline value.
                  </p>
                )}
              </div>
            )}

            {/* Activities by type */}
            {summary.activities_by_type?.length > 0 && (
              <div className="bg-white rounded-[12px] border border-slate-200 p-5">
                <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Activities by Type</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {summary.activities_by_type.map((a) => (
                    <div key={a.type} className="rounded-[10px] bg-slate-50 border border-slate-100 p-3 text-center">
                      <div className="text-[20px] font-[700] text-slate-800">{fmt(a.count)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{a.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversions by rep */}
            {summary.conversions?.by_converter?.length > 0 && (
              <div className="bg-white rounded-[12px] border border-slate-200 p-5">
                <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Conversions by Rep</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 text-[11px] font-[600] text-slate-400 uppercase">Rep</th>
                        <th className="text-right py-2 px-3 text-[11px] font-[600] text-slate-400 uppercase">Count</th>
                        <th className="text-right py-2 px-3 text-[11px] font-[600] text-slate-400 uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.conversions.by_converter.map((c) => (
                        <tr key={c.mcc_rep_name} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">{c.mcc_rep_name || "—"}</td>
                          <td className="py-2 px-3 text-right font-[600] text-indigo-700">{fmt(c.count)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700">Rs {fmt(c.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Exports */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5">
              <h2 className="text-[14px] font-[700] text-slate-700 mb-4">Exports</h2>
              <div className="space-y-4">
                {/* Summary */}
                <div>
                  <h3 className="text-[12px] font-[600] text-slate-500 uppercase tracking-wide mb-2">Summary Report</h3>
                  <div className="flex gap-2 flex-wrap">
                    <ExportBtn
                      label="CSV"
                      loading={exporting["summary-csv"]}
                      onClick={() => handleExportSummary("csv")}
                    />
                    <ExportBtn
                      label="Excel"
                      loading={exporting["summary-xlsx"]}
                      onClick={() => handleExportSummary("xlsx")}
                    />
                  </div>
                </div>
                {/* Lead Rows */}
                <div>
                  <h3 className="text-[12px] font-[600] text-slate-500 uppercase tracking-wide mb-2">Lead Rows (Filtered)</h3>
                  <div className="flex gap-2 flex-wrap">
                    <ExportBtn
                      label="CSV"
                      loading={exporting["leads-csv"]}
                      onClick={() => handleExportLeads("csv")}
                    />
                    <ExportBtn
                      label="Excel"
                      loading={exporting["leads-xlsx"]}
                      onClick={() => handleExportLeads("xlsx")}
                    />
                  </div>
                </div>
                {/* Full Datasets (Admin) */}
                {isAdmin && (
                  <div>
                    <h3 className="text-[12px] font-[600] text-slate-500 uppercase tracking-wide mb-2">Full Datasets</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {["leads", "activities", "tasks", "clients", "contracts"].map((ds) => (
                        <div key={ds} className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-[600] text-slate-500 capitalize">{ds}</span>
                          <div className="flex gap-1">
                            <ExportBtn
                              label="CSV"
                              loading={exporting[`${ds}-csv`]}
                              onClick={() => handleExportDataset(ds, "csv")}
                            />
                            <ExportBtn
                              label="XLS"
                              loading={exporting[`${ds}-xlsx`]}
                              onClick={() => handleExportDataset(ds, "xlsx")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
