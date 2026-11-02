import React, { useState, useEffect, useRef } from "react";
import {
  X as XMarkIcon,
  CalendarDays as CalendarDaysIcon,
  Phone as PhoneIcon,
  Building2 as BuildingOffice2Icon,
  RefreshCw as ArrowPathIcon,
  MessagesSquare as ChatBubbleLeftRightIcon,
  Tag as TagIcon,
  Clock3 as ClockIcon,
} from "lucide-react";
import { getSubStatusClasses } from "./helpers.js";
import { catalogService, leadService } from "../services/api";
import useModalScrollLock from "../hooks/useModalScrollLock.js";
import { isValidPhoneNumber } from "../utils/validation.js";

/**
 * ActivityModal — renamed from "Pipeline" to "Activity Log" (Task 3.1)
 * Aligned with crm2-backend Activity model.
 *
 * Task 3.2: Restructured fields:
 *   - "Source" renamed to "Details"
 *   - Outcome field REMOVED (Task 3.7)
 *   - Added: Followup Date, Substatus, Remarks, Date (activity_at)
 * Task 3.6: Activity Type is a dynamic dropdown (DB-driven, not hardcoded)
 * Task 3.7: Outcome option removed entirely
 *
 * POST /activities/
 * {
 *   activity_at: datetime (ISO, backdatable, no future),
 *   type: string (from settings/DB),
 *   sub_status: string (new SUB_STATUS_CHOICES),
 *   remarks: string (required),
 *   followup_at: datetime (required),
 * }
 */

const DEFAULT_ACTIVITY_TYPES = [
  { label: "Phone", value: "phone", icon: null },
  { label: "Field visit", value: "field visit", icon: null },
  { label: "WhatsApp", value: "WhatsApp", icon: null },
  { label: "Email", value: "email", icon: null },
  { label: "Meeting", value: "meeting", icon: null },
  { label: "Demo", value: "demo", icon: null },
];

const QUICK_PRESET_VALUES = [];

const DEFAULT_SUB_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Follow-up",
  "Visit scheduled",
  "Demo scheduled",
  "Proposal sent",
  "Interested",
  "On hold",
  "Not interested",
];

const toLocalDateTimeInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

/**
 * ActivityModal
 * Props:
 *   lead          — the lead object
 *   onClose       — close handler
 *   onSave        — async save handler
 *   authToken     — required for fetching dynamic activity types
 *   activityTypes — optional override array of {label, value} (legacy)
 */
const ActivityModal = ({ lead, onClose, onSave, authToken, activityTypes }) => {
  useModalScrollLock();
  // Fetch activity types dynamically from /catalogs/dropdowns/?group=activity_type
  const [dynamicTypes, setDynamicTypes] = useState(null); // null = loading

  useEffect(() => {
    if (!authToken) return;
    catalogService
      .getActivityTypes(authToken)
      .then((types) => {
        if (types && types.length > 0) setDynamicTypes(types);
        else setDynamicTypes(DEFAULT_ACTIVITY_TYPES); // fallback
      })
      .catch(() => setDynamicTypes(DEFAULT_ACTIVITY_TYPES)); // fallback on error
  }, [authToken]);

  // Resolve final type list: prop override > fetched > defaults
  const ACTIVITY_TYPES =
    (Array.isArray(activityTypes) && activityTypes.length > 0
      ? activityTypes.map((t) => ({
          label: typeof t === "string" ? t : t.label || t.name || t.value,
          value: typeof t === "string" ? t : t.value || t.name || t.label,
          icon: null,
        }))
      : null) ||
    dynamicTypes ||
    DEFAULT_ACTIVITY_TYPES;

  const [dynamicSubStatusChoices, setDynamicSubStatusChoices] = useState(null);
  useEffect(() => {
    if (!authToken) return;
    leadService.getSubStatusChoices(authToken).then((choices) => {
      if (choices.length) setDynamicSubStatusChoices(choices);
    });
  }, [authToken]);
  const subStatusOptions = dynamicSubStatusChoices?.length
    ? dynamicSubStatusChoices.map((choice) => ({
        value: choice.value,
        label: choice.label,
      }))
    : DEFAULT_SUB_STATUS_OPTIONS.map((value) => ({ value, label: value }));

  const quickPresets = ACTIVITY_TYPES.filter((t) =>
    QUICK_PRESET_VALUES.includes(t.value)
  ).slice(0, 3);

  // activity_at — defaults to today (backdatable, no future) — Task 3.2: "Date" field
  const todayISO = toLocalDateTimeInput(new Date());
  const [activityAt, setActivityAt] = useState(todayISO);

  // type — backend choice value — Task 3.6: dynamic
  const [activityType, setActivityType] = useState(
    ACTIVITY_TYPES[0]?.value || "phone"
  );

  // followup_at — required — Task 3.2
  const [followupAt, setFollowupAt] = useState("");

  // remarks — required — Task 3.2
  const [remarks, setRemarks] = useState("");

  // sub_status — lead pipeline position — Task 3.5: editable only here
  const [subStatus, setSubStatus] = useState(
    lead?.sub_status || "New"
  );
  const [scheduleDemoOpen, setScheduleDemoOpen] = useState(false);
  const [scheduleDemoError, setScheduleDemoError] = useState("");
  const [scheduleDemoForm, setScheduleDemoForm] = useState({
    demo_at: "",
    assigned_teacher: "",
    contact_person: lead?.contact_person || "",
    phone: lead?.contact_number || "",
    details: "",
  });

  useEffect(() => {
    if (!subStatusOptions.some((option) => option.value === subStatus)) {
      setSubStatus(subStatusOptions[0]?.value || "New");
    }
  }, [subStatus, subStatusOptions]);

  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    if (!followupAt) {
      setError("Follow-up date is required.");
      return;
    }
    if (new Date(followupAt) < new Date()) {
      setError("Follow-up date cannot be in the past.");
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      // Build payload matching crm2-backend Activity model
      // Task 3.7: outcome field removed entirely
      const payload = {
        activity_at: activityAt
          ? new Date(activityAt).toISOString()
          : new Date().toISOString(),
        type: activityType,
        // Demo scheduled is only written by the atomic demo scheduling path.
        sub_status: subStatus.toLowerCase() === "demo scheduled" ? "" : subStatus,
        remarks: remarks.trim(),
        followup_at: new Date(followupAt).toISOString(),
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to save activity. Please try again.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const handleScheduleDemo = async () => {
    if (!scheduleDemoForm.demo_at) {
      setScheduleDemoError("Demo date and time are required.");
      return;
    }
    if (new Date(scheduleDemoForm.demo_at) < new Date()) {
      setScheduleDemoError("Demo date and time cannot be in the past.");
      return;
    }
    if (scheduleDemoForm.phone.trim() && !isValidPhoneNumber(scheduleDemoForm.phone)) {
      setScheduleDemoError("Phone must contain exactly 10 local digits. +977 is accepted.");
      return;
    }

    setSaving(true);
    setScheduleDemoError("");
    try {
      await onSave({
        demo: {
          demo_at: new Date(scheduleDemoForm.demo_at).toISOString(),
          assigned_teacher: scheduleDemoForm.assigned_teacher.trim(),
          contact_person: scheduleDemoForm.contact_person.trim(),
          phone: scheduleDemoForm.phone.trim(),
          details: scheduleDemoForm.details.trim(),
        },
      });
      onClose();
    } catch (err) {
      setScheduleDemoError(err?.message || "Failed to schedule the demo.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickFollowUp = (daysAhead) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setFollowupAt(toLocalDateTimeInput(target));
  };

  // Display title
  const contactTitle =
    lead?.school_name ||
    lead?.contact_person ||
    "Activity Log";

  const contactSubtitle = [
    lead?.contact_person || null,
    lead?.contact_number || null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity crm-animate-in crm-fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                <CalendarDaysIcon className="h-4 w-4" />
              </span>
              {/* Task 3.1: "Activity Log" label */}
              <h2 className="text-base font-bold text-slate-900">
                Log Activity
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {contactTitle}
              {contactSubtitle && (
                <span className="text-slate-400 font-normal"> ({contactSubtitle})</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Task 3.2: Date field (activity_at) — auto-set to today, editable */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              <CalendarDaysIcon className="h-3.5 w-3.5 text-primary" />
              <span>Date</span>
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="datetime-local"
              value={activityAt}
              onChange={(e) => setActivityAt(e.target.value)}
              max={todayISO}
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all text-slate-800"
            />
            <p className="mt-1 text-xs text-slate-400">Cannot be set in the future.</p>
          </div>

          {/* Task 3.6: Activity Type — dynamic dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <TagIcon className="h-3.5 w-3.5 text-primary" />
                <span>Activity Type</span>
                <span className="text-rose-500 ml-0.5">*</span>
              </label>
            </div>

            {/* Quick preset buttons */}
            {quickPresets.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {quickPresets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = activityType === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setActivityType(preset.value)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Full Select Dropdown */}
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all text-slate-800"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Task 3.2: Substatus — editable only here (Task 3.5) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <ArrowPathIcon className="h-3.5 w-3.5 text-primary" />
                <span>Substatus</span>
              </label>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getSubStatusClasses(subStatus)}`}
              >
                {subStatus}
              </span>
            </div>
            <select
              value={subStatus}
              onChange={(e) => {
                const nextStatus = e.target.value;
                if (nextStatus.toLowerCase() === "demo scheduled") {
                  setScheduleDemoError("");
                  setScheduleDemoForm((current) => ({
                    ...current,
                    contact_person: current.contact_person || lead?.contact_person || "",
                    phone: current.phone || lead?.contact_number || "",
                  }));
                  setScheduleDemoOpen(true);
                  return;
                }
                setSubStatus(nextStatus);
              }}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all text-slate-800 font-medium"
            >
              {subStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Choosing “Demo scheduled” opens the demo form and creates its activity log with the demo.
            </p>
          </div>

          {/* Task 3.2: Followup Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <ClockIcon className="h-3.5 w-3.5 text-primary" />
                <span>Followup Date</span>
                <span className="text-rose-500 ml-0.5">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[
                  { label: "+1 Day", days: 1 },
                  { label: "+3 Days", days: 3 },
                  { label: "+1 Wk", days: 7 },
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleQuickFollowUp(days)}
                    className="text-xs font-medium text-primary hover:text-primary-hover px-1.5 py-0.5 rounded hover:bg-primary-light"
                  >
                    {label}
                  </button>
                ))}
                {followupAt && (
                  <button
                    type="button"
                    onClick={() => setFollowupAt("")}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input
              type="datetime-local"
              value={followupAt}
              onChange={(e) => setFollowupAt(e.target.value)}
              min={todayISO}
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all text-slate-800"
            />
          </div>

          {/* Task 3.2: Remarks (required) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-primary" />
              <span>Remarks</span>
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              placeholder="What was discussed? Next steps..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Task 3.7: Outcome field REMOVED */}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Activity</span>
              )}
            </button>
          </div>
        </form>
      </div>
      {scheduleDemoOpen && (
        <div
          data-modal-open="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={(event) => {
            if (event.target === event.currentTarget && !saving) setScheduleDemoOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="schedule-demo-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 id="schedule-demo-title" className="text-base font-bold text-slate-900">Schedule Demo</h3>
              <p className="mt-1 text-xs text-slate-500">A demo record and its activity log will be created together for {contactTitle}.</p>
            </div>
            <div className="space-y-3 p-5">
              {scheduleDemoError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{scheduleDemoError}</div>}
              <label className="block text-xs font-semibold text-slate-600">
                Demo date and time *
                <input
                  type="datetime-local"
                  min={todayISO}
                  value={scheduleDemoForm.demo_at}
                  onChange={(event) => setScheduleDemoForm((form) => ({ ...form, demo_at: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Instructor
                <input
                  value={scheduleDemoForm.assigned_teacher}
                  onChange={(event) => setScheduleDemoForm((form) => ({ ...form, assigned_teacher: event.target.value }))}
                  maxLength={255}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Contact person
                  <input
                    value={scheduleDemoForm.contact_person}
                    onChange={(event) => setScheduleDemoForm((form) => ({ ...form, contact_person: event.target.value }))}
                    maxLength={255}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Contact phone
                  <input
                    value={scheduleDemoForm.phone}
                    onChange={(event) => setScheduleDemoForm((form) => ({ ...form, phone: event.target.value }))}
                    maxLength={32}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Details
                <textarea
                  rows={3}
                  value={scheduleDemoForm.details}
                  onChange={(event) => setScheduleDemoForm((form) => ({ ...form, details: event.target.value }))}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setScheduleDemoOpen(false)} disabled={saving} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleScheduleDemo} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
                  {saving ? "Scheduling…" : "Create Demo & Save Activity"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityModal;
