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
  ChevronLeft,
  ChevronRight,
  RotateCw,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/useAuth.js";
import { demoService, leadService } from "../services/api";
import { isValidPhoneNumber } from "../utils/validation";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

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
    badge: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
  rescheduled: {
    label: "Rescheduled",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
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
  const [searchParams] = useSearchParams();
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
      if (statusFilter && statusFilter !== "all") params.demo_status = statusFilter;
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
    setSearchQuery(searchParams.get("search") || "");
    setStatusFilter(searchParams.get("demo_status") || (searchParams.get("feedback") === "pending" ? "scheduled" : "all"));
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
    const scheduled = demos.filter((d) => d.demo_status === "scheduled").length;
    const completed = demos.filter((d) => d.demo_status === "completed").length;
    const cancelled = demos.filter((d) => d.demo_status === "cancelled").length;
    return { total, scheduled, completed, cancelled };
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
    <div className="flex flex-col min-h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#EDF2FC] flex items-center justify-center">
                <MonitorPlay className="w-5 h-5 text-[#294998]" />
              </div>
              <div>
                <h1 className="text-[20px] font-[700] text-slate-900 leading-tight tracking-[-0.015em]">
                  Demo Management
                </h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Schedule and track school demonstrations.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDemos}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-[500] text-slate-700 bg-[#EEF2F6] rounded-[8px] hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {canScheduleDemo && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[#294998] text-white text-[13px] font-[500] rounded-[8px] hover:bg-[#1E3776] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Schedule Demo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total demos", value: stats.total, icon: MonitorPlay, color: "text-[#294998] bg-[#EDF2FC]" },
            { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "text-blue-700 bg-blue-50" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
            { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-red-700 bg-red-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-[12px] border border-slate-200 p-4 flex items-center gap-3 hover:border-slate-300 transition-colors">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[12px] font-[500] text-slate-500">{s.label}</div>
                <div className="text-[24px] leading-7 font-[700] text-slate-900 tabular-nums">{s.value}</div>
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
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#294998]/20 focus:border-[#294998]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#294998]/20 focus:border-[#294998]"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading demos…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 gap-3 text-red-600">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-[14px]">{error}</p>
            <button onClick={fetchDemos} className="text-[13px] underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400 gap-3">
            <MonitorPlay className="w-10 h-10 opacity-30" />
            <p className="text-[14px]">No demos found.</p>
            {canScheduleDemo && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#294998] text-white text-[13px] font-[600] rounded-[8px] hover:bg-[#1E3776] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998] focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" /> Schedule your first demo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["School", "Demo Date/Time", "Status", "Assigned Teacher", "Contact", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-[600] text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">
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
                          <div className="font-[600] text-slate-800">{demo.school_name || demo.system_id}</div>
                          {demo.details && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{demo.details}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {fmt(demo.demo_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-[600] ${cfg.badge}`}>
                            {cfg.icon ? <cfg.icon className="w-3.5 h-3.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.assigned_teacher || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.contact_person || "—"}
                          {demo.phone && <div className="text-[11px] text-slate-400">{demo.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingDemo(demo)}
                              className="p-1.5 rounded-[6px] text-slate-500 hover:text-[#294998] hover:bg-[#EDF2FC] transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(isAdmin || isB2b || isAcademic) && (
                              <button
                                onClick={() => openEdit(demo)}
                                className="p-1.5 rounded-[6px] text-slate-500 hover:text-[#294998] hover:bg-[#EDF2FC] transition-colors"
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
                                  className="p-1.5 rounded-[6px] text-slate-500 hover:text-[#294998] hover:bg-[#EDF2FC] transition-colors"
                                  title="Submit Feedback"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}
                            {(isAdmin || isB2b) && (
                              <button
                                onClick={() => { setDeletingDemo(demo); setSaveError(null); }}
                                className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[11px] font-[600] text-red-600 hover:bg-red-50 transition-colors"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-[13px] text-slate-600">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 rounded-[6px] border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">{currentPage}/{totalPages}</span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 rounded-[6px] border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── View Modal ────────────────────────────────────────────────────────── */}
      {viewingDemo && (
        <Modal title="Demo Details" onClose={() => setViewingDemo(null)}>
          <DetailRow label="School" value={viewingDemo.school_name} />
          <DetailRow label="System ID" value={viewingDemo.system_id} />
          <DetailRow label="Status">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${statusCfg(viewingDemo.demo_status).badge}`}>
              {statusCfg(viewingDemo.demo_status).label}
            </span>
          </DetailRow>
          <DetailRow label="Demo Date" value={fmt(viewingDemo.demo_at)} />
          <DetailRow label="Contact Person" value={viewingDemo.contact_person} />
          <DetailRow label="Phone" value={viewingDemo.phone} />
          <DetailRow label="Academic" value={viewingDemo.academic_username || (viewingDemo.academic ? `Academic #${viewingDemo.academic}` : "Unassigned")} />
          <DetailRow label="Assigned Teacher" value={viewingDemo.assigned_teacher} />
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
            <FormGroup label="Assigned Teacher">
              <input
                type="text"
                maxLength={255}
                value={createForm.assigned_teacher}
                onChange={(e) => setCreateForm((f) => ({ ...f, assigned_teacher: e.target.value }))}
                className={inputCls}
                placeholder="Teacher's name"
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
            {saveError && <p className="text-red-600 text-[12px]">{saveError}</p>}
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
            <FormGroup label="Assigned Teacher">
              <input
                type="text"
                maxLength={255}
                value={editForm.assigned_teacher}
                onChange={(e) => setEditForm((f) => ({ ...f, assigned_teacher: e.target.value }))}
                className={inputCls}
                placeholder="Teacher's name"
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
            {saveError && <p className="text-red-600 text-[12px]">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setEditingDemo(null)} label="Save Changes" />
          </form>
        </Modal>
      )}

      {/* ─── Feedback Modal ────────────────────────────────────────────────────── */}
      {feedbackOpen && feedbackDemo && (
        <Modal title={`Feedback — ${feedbackDemo.school_name}`} onClose={() => setFeedbackOpen(false)}>
          <form onSubmit={handleFeedback} className="space-y-4">
            <FormGroup label="Outcome">
              <input
                type="text"
                maxLength={40}
                value={feedbackForm.outcome}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, outcome: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Positive, Needs follow-up"
              />
            </FormGroup>
            <FormGroup label="Program">
              <input
                type="text"
                maxLength={100}
                value={feedbackForm.program}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, program: e.target.value }))}
                className={inputCls}
                placeholder="Program demonstrated"
              />
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
            {saveError && <p className="text-red-600 text-[12px]">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setFeedbackOpen(false)} label="Submit Feedback" />
          </form>
        </Modal>
      )}

      {deletingDemo && (
        <Modal title="Delete Demo" onClose={() => setDeletingDemo(null)}>
          <p className="text-[13px] leading-5 text-slate-600">
            Delete the demo for <strong>{deletingDemo.school_name || deletingDemo.system_id}</strong> scheduled on <strong>{fmt(deletingDemo.demo_at)}</strong>? This action cannot be undone.
          </p>
          {saveError && <p className="text-red-600 text-[12px]">{saveError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingDemo(null)}
              disabled={saving}
              className="px-3 py-2 text-[13px] font-[500] text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-50"
            >Cancel</button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-[600] text-white bg-red-600 rounded-[8px] hover:bg-red-700 disabled:opacity-50"
            ><Trash2 className="w-3.5 h-3.5" />{saving ? "Deleting…" : "Delete Demo"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Tiny sub-components ──────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#294998]/20 focus:border-[#294998]";

const FormGroup = ({ label, children }) => (
  <div>
    <label className="block text-[12px] font-[600] text-slate-600 mb-1">{label}</label>
    {children}
  </div>
);

const DetailRow = ({ label, value, children }) => (
  <div className="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
    <span className="text-[12px] font-[600] text-slate-400 w-[130px] shrink-0">{label}</span>
    <span className="text-[13px] text-slate-700 flex-1">{children ?? (value || "—")}</span>
  </div>
);

const ModalActions = ({ saving, onCancel, label }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="px-4 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-50"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-[#294998] text-white text-[13px] font-[500] rounded-[8px] hover:bg-[#1E3776] disabled:opacity-60 shadow-sm"
    >
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {label}
    </button>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-[15px] font-[700] text-slate-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-[6px] text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

export default Demo;
