import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  School,
  ShieldAlert,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/useAuth.js";
import { approvalService } from "../services/api.js";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" });
};

const Approvals = () => {
  const { authToken, user } = useAuth();
  const isAdmin = String(user?.role || localStorage.getItem("role") || "").toLowerCase() === "admin";
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!authToken || !isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const result = await approvalService.getQueue(authToken, page, 25);
      const nextCount = Array.isArray(result) ? result.length : result?.count || 0;
      const nextPages = Math.max(1, Math.ceil(nextCount / 25));
      setCount(nextCount);
      setPages(nextPages);
      if (page > nextPages) {
        setPage(nextPages);
        return;
      }
      setRows(Array.isArray(result) ? result : result?.results || []);
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError.message || "Could not load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, [authToken, isAdmin, page]);

  useEffect(() => { loadQueue(); }, [loadQueue]);
  useRealtimeRefresh(authToken, loadQueue);

  const submitDecision = async () => {
    if (!review || (review.decision === "reject" && !reason.trim())) return;
    setSaving(true);
    setError("");
    try {
      let result;
      let bulkMessage = "";
      if (review.bulk) {
        result = await approvalService.batchReview(
          review.ids,
          review.decision,
          authToken,
          review.decision === "reject" ? reason.trim() : "",
        );
      } else {
        result = await approvalService.decide(
          review.id,
          review.decision,
          review.decision === "reject" ? reason.trim() : "",
          authToken,
        );
      }
      if (review.bulk) {
        const outcomes = result?.results || [];
        const expected = review.decision === "approve" ? "approved" : "rejected";
        const completed = outcomes.filter((item) => item.result === expected).length;
        const skipped = outcomes.length - completed;
        if (skipped) bulkMessage = `${completed} lead(s) ${expected}; ${skipped} could not be updated. Refresh and review the remaining queue.`;
      }
      setReview(null);
      setReason("");
      setSelected(new Set());
      window.dispatchEvent(new CustomEvent("crm:approvalUpdated"));
      await loadQueue();
      if (bulkMessage) setError(bulkMessage);
    } catch (saveError) {
      setError(saveError.message || "The approval decision could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return (
    <main className="grid min-h-[65vh] place-items-center p-6">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ShieldAlert className="h-6 w-6" /></span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Lead approvals are only available to CRM administrators.</p>
        <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#294998] px-4 py-2.5 text-sm font-semibold text-white">Return to dashboard <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </main>
  );

  if (loading && !rows.length) return <PageLoadingState />;

  return (
    <main className="min-h-full bg-[#F5F7FB]">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#294998]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:flex-row sm:items-end sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700">Admin review</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Lead approvals</h1>
            <p className="mt-1 text-sm text-slate-500">Review new school submissions before they enter the team pipeline.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{count} pending</span>
            <button onClick={loadQueue} aria-label="Refresh approvals" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </header>

        {selected.size > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <span className="text-xs font-semibold text-blue-900">{selected.size} lead(s) selected</span>
          <div className="flex gap-2">
            <button onClick={() => { setReason(""); setReview({ decision: "reject", bulk: true, ids: [...selected] }); }} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Reject selected</button>
            <button onClick={() => { setReason(""); setReview({ decision: "approve", bulk: true, ids: [...selected] }); }} className="rounded-lg bg-[#294998] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#1E3776]">Approve selected</button>
          </div>
        </div>}

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><input type="checkbox" aria-label="Select all leads on this page" checked={rows.length > 0 && rows.every((lead) => selected.has(lead.id))} onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((lead) => lead.id)) : new Set())} className="h-4 w-4 rounded border-slate-300 text-[#294998] focus:ring-[#294998]" /><div><h2 className="text-sm font-semibold text-slate-900">Submission queue</h2><p className="mt-1 text-xs text-slate-500">Oldest pending submissions appear first.</p></div></div>
            <span className="text-[11px] font-medium text-slate-400">Page {page} of {pages}</span>
          </div>
          {rows.length ? <div className="divide-y divide-slate-100">
            {rows.map((lead) => <article key={lead.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <input type="checkbox" checked={selected.has(lead.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id); return next; })} aria-label={`Select ${lead.school_name}`} className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#294998] focus:ring-[#294998]" />
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#294998]"><School className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <Link to={`/leads?search=${encodeURIComponent(lead.school_name || "")}`} className="truncate text-sm font-semibold text-slate-900 hover:text-[#294998]">{lead.school_name}</Link>
                <p className="mt-1 text-[11px] text-slate-500">{lead.system_id} · {lead.municipality}, {lead.district}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{lead.created_by_username || "Unknown submitter"}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Submitted {formatDate(lead.created_at)}</span>
                  <span>{lead.contact_person} · {lead.contact_number}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => { setReason(""); setReview({ ...lead, decision: "reject" }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"><XCircle className="h-3.5 w-3.5" />Reject</button>
                <button onClick={() => { setReason(""); setReview({ ...lead, decision: "approve" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#294998] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#1E3776]"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
              </div>
            </article>)}
          </div> : <div className="grid min-h-64 place-items-center px-6 text-center">
            <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><h3 className="mt-3 text-sm font-semibold text-slate-800">No pending submissions</h3><p className="mt-1 text-xs text-slate-500">New school leads submitted for review will appear here.</p></div>
          </div>}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 sm:px-6">
            <span className="text-[11px] text-slate-400">{count} submissions in the queue</span>
            <div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-40">Previous</button><button disabled={page >= pages || loading} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-40">Next</button></div>
          </div>
        </section>
      </div>

      {review && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setReview(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="approval-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${review.decision === "approve" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{review.bulk ? `${review.decision} selected leads` : `${review.decision} submission`}</span><h2 id="approval-dialog-title" className="mt-3 text-lg font-semibold text-slate-900">{review.bulk ? `${review.ids.length} selected leads` : review.school_name}</h2>{!review.bulk && <p className="mt-1 text-xs text-slate-500">{review.system_id} · {review.municipality}, {review.district}</p>}</div><button onClick={() => setReview(null)} disabled={saving} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          {review.decision === "reject" ? <label className="mt-5 block text-xs font-semibold text-slate-700">Rejection reason <span className="font-normal text-slate-400">(required)</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} placeholder="Explain why this submission is being rejected…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label> : <p className="mt-5 text-sm leading-6 text-slate-600">Approve {review.bulk ? `${review.ids.length} selected leads` : "this lead"}? No reason is required.</p>}
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => setReview(null)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={submitDecision} disabled={saving || (review.decision === "reject" && !reason.trim())} className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${review.decision === "approve" ? "bg-[#294998] hover:bg-[#1E3776]" : "bg-rose-600 hover:bg-rose-700"}`}>{saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{review.decision === "approve" ? "Approve" : "Reject"}{review.bulk ? " leads" : " lead"}</button></div>
        </section>
      </div>}
    </main>
  );
};

export default Approvals;
