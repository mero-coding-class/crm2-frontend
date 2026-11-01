// src/pages/Demo.jsx — connected to crm2-backend /api/demos/
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MonitorPlay,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
  Eye,
  RotateCw,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/useAuth.js";
import { classService, demoService, leadService } from "../services/api";
import { containsLetter, isValidPhoneNumber } from "../utils/validation";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import DataTableShell from "../components/common/DataTableShell.jsx";
import Pagination from "../components/common/Pagination.jsx";
import { Button } from "../components/ui/button.jsx";
import { PageShell, PageHeader } from "../components/common/PageShell.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";
import useModalScrollLock from "../hooks/useModalScrollLock.js";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Calendar,
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  rescheduled: {
    label: "Rescheduled",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  follow_up: {
    label: "Follow-up Required",
    badge: "bg-orange-50 text-orange-700 border border-orange-200",
    dot: "bg-orange-500",
  },
};

const statusCfg = (s) =>
  STATUS_CONFIG[s?.toLowerCase()] || {
    label: s || "Unknown",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return isNaN(d.getTime())
    ? dt
    : d.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" });
};

const toDateTimeLocal = (dt) => {
  if (!dt) return "";
  const date = new Date(dt);
  if (isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

// ─── Component ────────────────────────────────────────────────────────────────
const Demo = () => {
  const { authToken, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = user?.role || "";
  const isAdmin = ["admin", "superadmin"].includes(role.toLowerCase());
  const isAcademic = role.toLowerCase() === "academic";
  const isB2b = role.toLowerCase() === "b2b";
  const canScheduleDemo = isAdmin || isB2b;

  // ── State ──────────────────────────────────────────────────────────────────
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── Leads for create-demo picker ────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [classesError, setClassesError] = useState("");

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("demo_status") || (searchParams.get("feedback") === "pending" ? "scheduled" : "all"));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState(null);
  const [viewingDemo, setViewingDemo] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDemo, setFeedbackDemo] = useState(null);
  const [deletingDemo, setDeletingDemo] = useState(null);
  useModalScrollLock(
    createOpen || Boolean(editingDemo) || Boolean(viewingDemo) || feedbackOpen || Boolean(deletingDemo)
  );

  // ── Forms ──────────────────────────────────────────────────────────────────
  const emptyCreate = { lead: "", demo_at: "", details: "", contact_person: "", phone: "", assigned_teacher: "" };
  const [createForm, setCreateForm] = useState(emptyCreate);

  const emptyEdit = {
    demo_at: "", details: "", contact_person: "", phone: "",
    assigned_teacher: "",
  };
  const [editForm, setEditForm] = useState(emptyEdit);

  const emptyFeedback = { outcome: "", program: "", feedback_notes: "" };
  const [feedbackForm, setFeedbackForm] = useState(emptyFeedback);

  // ── Fetch demos ─────────────────────────────────────────────────────────────
  const fetchDemos = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter && statusFilter !== "all" && searchParams.get("feedback") !== "pending") params.demo_status = statusFilter;
      if (searchParams.get("upcoming") === "true") params.upcoming = "true";
      if (searchParams.get("unassigned") === "true") params.unassigned = "true";
      if (searchParams.get("feedback") === "pending") params.feedback = "pending";
      if (searchParams.get("from")) params.from = searchParams.get("from");
      if (searchParams.get("to")) params.to = searchParams.get("to");
      const { results } = await demoService.getDemos(authToken, params);
      setDemos(results);
    } catch (e) {
      setError(e.message || "Failed to load demos.");
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter, searchParams]);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

  useEffect(() => {
    if (!authToken) return undefined;
    let cancelled = false;
    classService.getClasses(authToken).then((rows) => {
      if (!cancelled) setClasses(rows.filter((item) => item.active !== false));
    }).catch((loadError) => {
      if (!cancelled) setClassesError(loadError.message || "Could not load class choices.");
    });
    return () => { cancelled = true; };
  }, [authToken]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setStatusFilter(searchParams.get("demo_status") || "all");
  }, [searchParams]);

  // ── Fetch leads (for create picker) ────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!authToken) return;
    setLeadsLoading(true);
    try {
      const list = await leadService.getLeads(authToken);
      setLeads(Array.isArray(list) ? list : []);
    } catch { setLeads([]); } finally { setLeadsLoading(false); }
  }, [authToken]);

  useRealtimeRefresh(authToken, fetchDemos);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = demos.length;
    const scheduled = demos.filter((d) => ["scheduled", "rescheduled"].includes(d.demo_status)).length;
    const completed = demos.filter((d) => ["completed", "follow_up"].includes(d.demo_status)).length;
    const cancelled = demos.filter((d) => d.demo_status === "cancelled").length;
    const followUp = demos.filter((d) => d.demo_status === "follow_up").length;
    return { total, scheduled, completed, cancelled, followUp };
  }, [demos]);

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return demos.filter((d) => {
      if (!q) return true;
      return (
        (d.school_name || "").toLowerCase().includes(q) ||
        (d.system_id || "").toLowerCase().includes(q) ||
        (d.contact_person || "").toLowerCase().includes(q) ||
        (d.assigned_teacher || "").toLowerCase().includes(q) ||
        (d.academic_username || "").toLowerCase().includes(q) ||
        (d.details || "").toLowerCase().includes(q)
      );
    });
  }, [demos, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const s = (currentPage - 1) * pageSize;
    return filtered.slice(s, s + pageSize);
  }, [filtered, currentPage, pageSize]);

  // ── Reset page on filter change ────────────────────────────────────────────
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  // ── Handlers: Create ───────────────────────────────────────────────────────
  const openCreate = () => {
    setCreateForm(emptyCreate);
    setSaveError(null);
    fetchLeads();
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.lead || !createForm.demo_at) {
      setSaveError("Lead and Demo Date/Time are required.");
      return;
    }
    const selectedLead = leads.find((lead) => String(lead.id) === String(createForm.lead));
    if (!selectedLead?.school_name?.trim() || !containsLetter(selectedLead.school_name)) {
      setSaveError("The selected lead needs a valid institution name before a demo can be scheduled.");
      return;
    }
    if (new Date(createForm.demo_at) < new Date()) {
      setSaveError("Demo Date & Time cannot be in the past.");
      return;
    }
    if (createForm.phone.trim() && !isValidPhoneNumber(createForm.phone)) {
      setSaveError("Phone must contain exactly 10 local digits. +977 is accepted.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        lead: createForm.lead,
        demo_at: createForm.demo_at,
        details: createForm.details || "",
        contact_person: createForm.contact_person || "",
        phone: createForm.phone || "",
        assigned_teacher: createForm.assigned_teacher || "",
      };
      await demoService.createDemo(payload, authToken);
      setCreateOpen(false);
      fetchDemos();
    } catch (e) {
      setSaveError(e.message || "Failed to schedule demo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers: Edit / Update ────────────────────────────────────────────────
  const openEdit = (demo) => {
    setEditingDemo(demo);
    setEditForm({
      demo_at: toDateTimeLocal(demo.demo_at),
      details: demo.details || "",
      contact_person: demo.contact_person || "",
      phone: demo.phone || "",
      assigned_teacher: demo.assigned_teacher || "",
    });
    setSaveError(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingDemo) return;
    if (!editForm.demo_at) {
      setSaveError("Demo Date/Time is required.");
      return;
    }
    const changedTime = new Date(editForm.demo_at).getTime() !== new Date(editingDemo.demo_at).getTime();
    if (changedTime && new Date(editForm.demo_at) < new Date()) {
      setSaveError("Demo Date & Time cannot be in the past.");
      return;
    }
    if ((isAdmin || isB2b || isAcademic) && editForm.phone.trim() && !isValidPhoneNumber(editForm.phone)) {
      setSaveError("Phone must contain exactly 10 local digits. +977 is accepted.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const allowed = {};
      if (editForm.demo_at) allowed.demo_at = editForm.demo_at;
      if (editForm.details !== undefined) allowed.details = editForm.details;
      if (editForm.assigned_teacher !== undefined) allowed.assigned_teacher = editForm.assigned_teacher;
      // Keep PATCH limited to fields the user changed. In particular, don't
      // resend B2B contact snapshots on an unrelated reschedule/details edit.
      if ((isAdmin || isAcademic || isB2b) &&
          editForm.contact_person !== (editingDemo.contact_person || "")) {
        allowed.contact_person = editForm.contact_person;
      }
      if ((isAdmin || isAcademic || isB2b) &&
          editForm.phone !== (editingDemo.phone || "")) {
        allowed.phone = editForm.phone;
      }
      await demoService.updateDemo(editingDemo.id, allowed, authToken);
      setEditingDemo(null);
      fetchDemos();
    } catch (e) {
      setSaveError(e.message || "Failed to update demo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers: Feedback ─────────────────────────────────────────────────────
  const openFeedback = (demo) => {
    setFeedbackDemo(demo);
    setFeedbackForm(emptyFeedback);
    setSaveError(null);
    setFeedbackOpen(true);
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackDemo) return;
    setSaving(true);
    setSaveError(null);
    try {
      await demoService.submitFeedback(feedbackDemo.id, feedbackForm, authToken);
      setFeedbackOpen(false);
      setFeedbackDemo(null);
      fetchDemos();
    } catch (e) {
      setSaveError(e.message || "Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDemo) return;
    setSaving(true);
    setSaveError(null);
    try {
      await demoService.deleteDemo(deletingDemo.id, authToken);
      setDeletingDemo(null);
      fetchDemos();
    } catch (e) {
      setSaveError(e.message || "Failed to delete demo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && demos.length === 0) return <PageLoadingState />;

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <PageShell className="flex flex-col">
      <PageHeader
        title={(
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-light">
              <MonitorPlay className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            Demo Management
          </span>
        )}
        description="Schedule and track school demonstrations."
        actions={(
          <>
            <Button
              type="button"
              variant="refresh"
              onClick={fetchDemos}
              disabled={loading}
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canScheduleDemo && (
              <Button
                type="button"
                variant="primary"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" />
                Schedule Demo
              </Button>
            )}
          </>
        )}
      />

      {searchParams.get("from") && searchParams.get("to") && (
        <div className="mx-6 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Showing demos from {searchParams.get("from").slice(0, 10)} through {searchParams.get("to").slice(0, 10)}.
          <button type="button" className="ml-2 font-semibold underline" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("from"); next.delete("to"); setSearchParams(next); }}>Clear date range</button>
        </div>
      )}
      {searchParams.get("upcoming") === "true" && (
        <div className="mx-6 mt-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-800">
          Showing future scheduled and rescheduled demos.
          <button type="button" className="ml-2 font-semibold underline" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("upcoming"); setSearchParams(next); }}>Clear upcoming filter</button>
        </div>
      )}

      {/* Stats */}
      <div className="flex-1 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: "Total demos", value: stats.total, icon: MonitorPlay, color: "text-primary bg-primary-light" },
            { label: "Scheduled / rescheduled", value: stats.scheduled, icon: Calendar, color: "text-blue-700 bg-blue-50" },
            { label: "Completed sessions", value: stats.completed, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
            { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-rose-700 bg-rose-50" },
            { label: "Follow-up required", value: stats.followUp, icon: MessageSquare, color: "text-orange-700 bg-orange-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-[12px] border border-slate-200 p-4 flex items-center gap-3 hover:border-slate-300 transition-colors">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{s.label}</div>
                <div className="text-2xl leading-7 font-bold text-slate-900 tabular-nums">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school or contact…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[8px] text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-[8px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Scheduled or Rescheduled</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="follow_up">Follow-up Required</option>
        </select>
      </div>

      {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading demos…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 gap-3 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm">{error}</p>
            <button onClick={fetchDemos} className="text-sm underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400 gap-3">
            <MonitorPlay className="w-10 h-10 opacity-30" />
            <p className="text-sm">No demos found.</p>
            {canScheduleDemo && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-[8px] hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" /> Schedule your first demo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <DataTableShell
              minWidth="900px"
              pagination={totalPages > 1 ? (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  disabled={loading}
                  summary={<span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>}
                />
              ) : null}
            >
              <div className="crm-data-table__scroll">
                <table>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["School", "Demo Date/Time", "Status", "Instructor", "Contact", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((demo) => {
                    const cfg = statusCfg(demo.demo_status);
                    return (
                      <tr key={demo.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{demo.school_name || demo.system_id}</div>
                          {demo.details && (
                            <div className="text-xs text-slate-400 truncate max-w-[200px]">{demo.details}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {fmt(demo.demo_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                            {cfg.icon ? <cfg.icon className="w-3.5 h-3.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.assigned_teacher || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.contact_person || "—"}
                          {demo.phone && <div className="text-xs text-slate-400">{demo.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingDemo(demo)}
                              className="p-1.5 rounded-[6px] text-slate-500 hover:text-primary hover:bg-primary-light transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(isAdmin || isB2b || isAcademic) && (
                              <button
                                onClick={() => openEdit(demo)}
                                className="p-1.5 rounded-[6px] text-slate-500 hover:text-primary hover:bg-primary-light transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {/* Any academic or admin can submit demo feedback. */}
                            {demo.demo_status === "scheduled" &&
                              (isAdmin || isAcademic) && (
                                <button
                                  onClick={() => openFeedback(demo)}
                                  className="p-1.5 rounded-[6px] text-slate-500 hover:text-primary hover:bg-primary-light transition-colors"
                                  title="Submit Feedback"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}
                            {(isAdmin || isB2b) && (
                              <button
                                onClick={() => { setDeletingDemo(demo); setSaveError(null); }}
                                className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete demo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </DataTableShell>

          </>
        )}
      </div>

      {/* ─── View Modal ────────────────────────────────────────────────────────── */}
      {viewingDemo && (
        <Modal title="Demo Details" onClose={() => setViewingDemo(null)}>
          <DetailRow label="School" value={viewingDemo.school_name} />
          <DetailRow label="System ID" value={viewingDemo.system_id} />
          <DetailRow label="Status">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg(viewingDemo.demo_status).badge}`}>
              {statusCfg(viewingDemo.demo_status).label}
            </span>
          </DetailRow>
          <DetailRow label="Demo Date" value={fmt(viewingDemo.demo_at)} />
          <DetailRow label="Contact Person" value={viewingDemo.contact_person} />
          <DetailRow label="Phone" value={viewingDemo.phone} />
          <DetailRow label="Demo Academic Assignee" value={viewingDemo.academic_username || (viewingDemo.academic ? `Academic #${viewingDemo.academic}` : "Unassigned")} />
          <DetailRow label="Instructor Name" value={viewingDemo.assigned_teacher} />
          <DetailRow label="Class / Program" value={viewingDemo.program} />
          <DetailRow label="Feedback outcome">
            {({ successful: "Successful", needs_follow_up: "Needs follow-up", not_interested: "Not interested" })[viewingDemo.outcome] || viewingDemo.outcome || "—"}
          </DetailRow>
          <DetailRow label="Feedback notes" value={viewingDemo.feedback_notes} />
          <DetailRow label="Feedback submitted" value={fmt(viewingDemo.feedback_at)} />
          <DetailRow label="Details" value={viewingDemo.details} />
        </Modal>
      )}

      {/* ─── Create Modal ──────────────────────────────────────────────────────── */}
      {createOpen && (
        <Modal title="Schedule New Demo" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormGroup label="Lead *">
              <select
                required
                value={createForm.lead}
                onChange={(e) => setCreateForm((f) => ({ ...f, lead: e.target.value }))}
                className={inputCls}
              >
                <option value="">{leadsLoading ? "Loading leads…" : "Select a lead"}</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.school_name} ({l.system_id})
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Demo Date & Time *">
              <input
                type="datetime-local"
                required
                min={toDateTimeLocal(new Date())}
                value={createForm.demo_at}
                onChange={(e) => setCreateForm((f) => ({ ...f, demo_at: e.target.value }))}
                className={inputCls}
              />
            </FormGroup>
            <FormGroup label="Contact Person">
              <input
                type="text"
                maxLength={255}
                value={createForm.contact_person}
                onChange={(e) => setCreateForm((f) => ({ ...f, contact_person: e.target.value }))}
                className={inputCls}
                placeholder="Name of contact at school"
              />
            </FormGroup>
            <FormGroup label="Phone">
              <input
                type="tel"
                maxLength={32}
                inputMode="tel"
                title="Enter exactly 10 local digits. A +977 country code is accepted."
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
                placeholder="Phone number"
              />
            </FormGroup>
            <FormGroup label="Instructor Name">
              <input
                type="text"
                maxLength={255}
                value={createForm.assigned_teacher}
                onChange={(e) => setCreateForm((f) => ({ ...f, assigned_teacher: e.target.value }))}
                className={inputCls}
                placeholder="Instructor name"
              />
            </FormGroup>
            <FormGroup label="Details">
              <textarea
                rows={3}
                value={createForm.details}
                onChange={(e) => setCreateForm((f) => ({ ...f, details: e.target.value }))}
                className={inputCls}
                placeholder="Demo agenda, requirements…"
              />
            </FormGroup>
            {saveError && <p className="text-rose-600 text-xs">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setCreateOpen(false)} label="Schedule Demo" />
          </form>
        </Modal>
      )}

      {/* ─── Edit Modal ────────────────────────────────────────────────────────── */}
      {editingDemo && (
        <Modal title={`Edit Demo — ${editingDemo.school_name}`} onClose={() => setEditingDemo(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormGroup label="Demo Date & Time">
              <input
                type="datetime-local"
                required
                value={editForm.demo_at}
                onChange={(e) => setEditForm((f) => ({ ...f, demo_at: e.target.value }))}
                className={inputCls}
              />
            </FormGroup>
            {(isAdmin || isB2b || isAcademic) && (
              <FormGroup label="Contact Person">
                <input
                  type="text"
                  maxLength={255}
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))}
                  className={inputCls}
                />
              </FormGroup>
            )}
            {(isAdmin || isB2b || isAcademic) && (
              <>
                <FormGroup label="Phone">
                  <input
                    type="tel"
                    maxLength={32}
                    inputMode="tel"
                    title="Enter exactly 10 local digits. A +977 country code is accepted."
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputCls}
                  />
                </FormGroup>
              </>
            )}
            <FormGroup label="Instructor Name">
              <input
                type="text"
                maxLength={255}
                value={editForm.assigned_teacher}
                onChange={(e) => setEditForm((f) => ({ ...f, assigned_teacher: e.target.value }))}
                className={inputCls}
                placeholder="Instructor name"
              />
            </FormGroup>
            <FormGroup label="Details">
              <textarea
                rows={3}
                value={editForm.details}
                onChange={(e) => setEditForm((f) => ({ ...f, details: e.target.value }))}
                className={inputCls}
              />
            </FormGroup>
            {saveError && <p className="text-rose-600 text-xs">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setEditingDemo(null)} label="Save Changes" />
          </form>
        </Modal>
      )}

      {/* ─── Feedback Modal ────────────────────────────────────────────────────── */}
      {feedbackOpen && feedbackDemo && (
        <Modal title={`Feedback — ${feedbackDemo.school_name}`} onClose={() => setFeedbackOpen(false)}>
          <form onSubmit={handleFeedback} className="space-y-4">
            <FormGroup label="Outcome *">
              <select
                required
                value={feedbackForm.outcome}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, outcome: e.target.value }))}
                className={inputCls}
              >
                <option value="">Choose an outcome</option>
                <option value="successful">Successful</option>
                <option value="needs_follow_up">Needs follow-up</option>
                <option value="not_interested">Not interested</option>
              </select>
            </FormGroup>
            <FormGroup label="Class / Program *">
              <select
                required
                value={feedbackForm.program}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, program: e.target.value }))}
                className={inputCls}
                disabled={!!classesError}
              >
                <option value="">{classesError || "Choose a class / program"}</option>
                {classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Feedback Notes">
              <textarea
                rows={4}
                value={feedbackForm.feedback_notes}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, feedback_notes: e.target.value }))}
                className={inputCls}
                placeholder="Detailed notes from the demo…"
              />
            </FormGroup>
            {saveError && <p className="text-rose-600 text-xs">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setFeedbackOpen(false)} label="Submit Feedback" />
          </form>
        </Modal>
      )}

      {deletingDemo && (
        <Modal title="Delete Demo" onClose={() => setDeletingDemo(null)}>
          <p className="text-sm leading-5 text-slate-600">
            Delete the demo for <strong>{deletingDemo.school_name || deletingDemo.system_id}</strong> scheduled on <strong>{fmt(deletingDemo.demo_at)}</strong>? This action cannot be undone.
          </p>
          {saveError && <p className="text-rose-600 text-xs">{saveError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingDemo(null)}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-50"
            >Cancel</button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-rose-600 rounded-[8px] hover:bg-rose-700 disabled:opacity-50"
            ><Trash2 className="w-3.5 h-3.5" />{saving ? "Deleting…" : "Delete Demo"}</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
};

// ─── Tiny sub-components ──────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const FormGroup = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
    {children}
  </div>
);

const DetailRow = ({ label, value, children }) => (
  <div className="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
    <span className="text-xs font-semibold text-slate-400 w-[130px] shrink-0">{label}</span>
    <span className="text-sm text-slate-700 flex-1">{children ?? (value || "—")}</span>
  </div>
);

const ModalActions = ({ saving, onCancel, label }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-50"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[8px] hover:bg-primary-hover disabled:opacity-60 shadow-sm"
    >
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {label}
    </button>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div data-modal-open="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-[6px] text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

export default Demo;
