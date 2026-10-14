// src/pages/Demo.jsx — connected to crm2-backend /api/demos/
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MonitorPlay,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Pencil,
  X,
  Building2,
  MapPin,
  User,
  Phone,
  GraduationCap,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  AlertTriangle,
  Loader2,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { demoService, leadService } from "../services/api";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
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

// ─── Component ────────────────────────────────────────────────────────────────
const Demo = () => {
  const { authToken, user } = useAuth();
  const role = user?.role || "";
  const isAdmin = ["admin", "superadmin"].includes(role.toLowerCase());
  const isAcademic = role === "academic";
  const isB2b = role === "b2b";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState(null);
  const [viewingDemo, setViewingDemo] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDemo, setFeedbackDemo] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDemo, setAssignDemoState] = useState(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const emptyCreate = { lead: "", demo_at: "", details: "", contact_person: "", phone: "" };
  const [createForm, setCreateForm] = useState(emptyCreate);

  const emptyEdit = { demo_at: "", details: "", demo_status: "", contact_person: "", phone: "" };
  const [editForm, setEditForm] = useState(emptyEdit);

  const emptyFeedback = { outcome: "", program: "", feedback_notes: "" };
  const [feedbackForm, setFeedbackForm] = useState(emptyFeedback);

  const emptyAssign = { academic: "", reason: "" };
  const [assignForm, setAssignForm] = useState(emptyAssign);

  // ── Fetch demos ─────────────────────────────────────────────────────────────
  const fetchDemos = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter && statusFilter !== "all") params.demo_status = statusFilter;
      const { results } = await demoService.getDemos(authToken, params);
      setDemos(results);
    } catch (e) {
      setError(e.message || "Failed to load demos.");
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter]);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

  // ── Fetch leads (for create picker) ────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!authToken) return;
    setLeadsLoading(true);
    try {
      const list = await leadService.getLeads(authToken);
      setLeads(Array.isArray(list) ? list : []);
    } catch (_) { setLeads([]); } finally { setLeadsLoading(false); }
  }, [authToken]);

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
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        lead: createForm.lead,
        demo_at: createForm.demo_at,
        details: createForm.details || "",
        contact_person: createForm.contact_person || "",
        phone: createForm.phone || "",
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
      demo_at: demo.demo_at ? demo.demo_at.slice(0, 16) : "",
      details: demo.details || "",
      demo_status: demo.demo_status || "scheduled",
      contact_person: demo.contact_person || "",
      phone: demo.phone || "",
    });
    setSaveError(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingDemo) return;
    setSaving(true);
    setSaveError(null);
    try {
      const allowed = {};
      if (editForm.demo_at) allowed.demo_at = editForm.demo_at;
      if (editForm.details !== undefined) allowed.details = editForm.details;
      if (editForm.contact_person !== undefined) allowed.contact_person = editForm.contact_person;
      if (editForm.phone !== undefined) allowed.phone = editForm.phone;
      // Only admins can change demo_status via the main update
      if (isAdmin && editForm.demo_status) allowed.demo_status = editForm.demo_status;
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

  // ── Handlers: Assign ───────────────────────────────────────────────────────
  const openAssign = (demo) => {
    setAssignDemoState(demo);
    setAssignForm(emptyAssign);
    setSaveError(null);
    setAssignOpen(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignDemo) return;
    if (!assignForm.academic || !assignForm.reason.trim()) {
      setSaveError("Academic user ID and reason are both required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await demoService.assignDemo(
        assignDemo.id,
        { academic: Number(assignForm.academic), reason: assignForm.reason },
        authToken
      );
      setAssignOpen(false);
      setAssignDemoState(null);
      fetchDemos();
    } catch (e) {
      setSaveError(e.message || "Failed to assign academic.");
    } finally {
      setSaving(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#EEF2FF] flex items-center justify-center">
                <MonitorPlay className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <div>
                <h1 className="text-[20px] font-[700] text-slate-900 leading-tight tracking-[-0.015em]">
                  Demo Management
                </h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Schedule, track and manage school demos — real-time from backend
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDemos}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-[8px] hover:bg-slate-50 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            {!isAcademic && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-[13px] font-[600] rounded-[8px] hover:bg-[#4338CA] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Schedule Demo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pt-5 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700 bg-slate-50 border-slate-200" },
          { label: "Scheduled", value: stats.scheduled, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Completed", value: stats.completed, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "Cancelled", value: stats.cancelled, color: "text-red-700 bg-red-50 border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-[10px] border p-4 ${s.color}`}>
            <div className="text-[24px] font-[700]">{s.value}</div>
            <div className="text-[12px] font-[500] mt-0.5 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school, contact, academic…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
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
            {!isAcademic && (
              <button onClick={openCreate} className="flex items-center gap-1.5 text-[13px] text-[#4F46E5] underline">
                <Plus className="w-4 h-4" /> Schedule your first demo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["School", "Demo Date/Time", "Status", "Academic", "Contact", "Actions"].map((h) => (
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
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.academic_username || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {demo.contact_person || "—"}
                          {demo.phone && <div className="text-[11px] text-slate-400">{demo.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingDemo(demo)}
                              className="p-1.5 rounded-[6px] text-slate-500 hover:bg-slate-100 transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Edit: B2B owns, admin all (not academic/b2c) */}
                            {(isAdmin || (isB2b && demo.demo_status !== "completed")) && (
                              <button
                                onClick={() => openEdit(demo)}
                                className="p-1.5 rounded-[6px] text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {/* Assign: admin only */}
                            {isAdmin && demo.demo_status === "scheduled" && (
                              <button
                                onClick={() => openAssign(demo)}
                                className="p-1.5 rounded-[6px] text-violet-500 hover:bg-violet-50 transition-colors"
                                title="Assign Academic"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {/* Feedback: academic assigned, or admin */}
                            {demo.demo_status === "scheduled" &&
                              (isAdmin || (isAcademic && demo.academic === user?.id)) && (
                                <button
                                  onClick={() => openFeedback(demo)}
                                  className="p-1.5 rounded-[6px] text-emerald-500 hover:bg-emerald-50 transition-colors"
                                  title="Submit Feedback"
                                >
                                  <MessageSquare className="w-4 h-4" />
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
          <DetailRow label="Details" value={viewingDemo.details} />
          <DetailRow label="Academic" value={viewingDemo.academic_username || "—"} />
          {viewingDemo.demo_status === "completed" && (
            <>
              <hr className="my-3 border-slate-100" />
              <h4 className="text-[12px] font-[700] text-slate-500 uppercase tracking-wide mb-2">Feedback</h4>
              <DetailRow label="Feedback By" value={viewingDemo.feedback_by_username} />
              <DetailRow label="Feedback At" value={fmt(viewingDemo.feedback_at)} />
              <DetailRow label="Program" value={viewingDemo.program} />
              <DetailRow label="Outcome" value={viewingDemo.outcome} />
              <DetailRow label="Notes" value={viewingDemo.feedback_notes} />
            </>
          )}
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
                value={createForm.contact_person}
                onChange={(e) => setCreateForm((f) => ({ ...f, contact_person: e.target.value }))}
                className={inputCls}
                placeholder="Name of contact at school"
              />
            </FormGroup>
            <FormGroup label="Phone">
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
                placeholder="Phone number"
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
                value={editForm.demo_at}
                onChange={(e) => setEditForm((f) => ({ ...f, demo_at: e.target.value }))}
                className={inputCls}
              />
            </FormGroup>
            <FormGroup label="Contact Person">
              <input
                type="text"
                value={editForm.contact_person}
                onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))}
                className={inputCls}
              />
            </FormGroup>
            <FormGroup label="Phone">
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
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
            {isAdmin && (
              <FormGroup label="Status">
                <select
                  value={editForm.demo_status}
                  onChange={(e) => setEditForm((f) => ({ ...f, demo_status: e.target.value }))}
                  className={inputCls}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </FormGroup>
            )}
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
                value={feedbackForm.outcome}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, outcome: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Positive, Needs follow-up"
              />
            </FormGroup>
            <FormGroup label="Program">
              <input
                type="text"
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

      {/* ─── Assign Modal ──────────────────────────────────────────────────────── */}
      {assignOpen && assignDemo && (
        <Modal title={`Assign Academic — ${assignDemo.school_name}`} onClose={() => setAssignOpen(false)}>
          <form onSubmit={handleAssign} className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Enter the <strong>User ID</strong> of the academic staff member to assign.
            </p>
            <FormGroup label="Academic User ID *">
              <input
                type="number"
                required
                value={assignForm.academic}
                onChange={(e) => setAssignForm((f) => ({ ...f, academic: e.target.value }))}
                className={inputCls}
                placeholder="User ID (integer)"
              />
            </FormGroup>
            <FormGroup label="Reason *">
              <textarea
                rows={3}
                required
                value={assignForm.reason}
                onChange={(e) => setAssignForm((f) => ({ ...f, reason: e.target.value }))}
                className={inputCls}
                placeholder="Why this academic is assigned to this demo"
              />
            </FormGroup>
            {saveError && <p className="text-red-600 text-[12px]">{saveError}</p>}
            <ModalActions saving={saving} onCancel={() => setAssignOpen(false)} label="Assign Academic" />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ─── Tiny sub-components ──────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]";

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
      className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-[13px] font-[600] rounded-[8px] hover:bg-[#4338CA] disabled:opacity-60 shadow-sm"
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
