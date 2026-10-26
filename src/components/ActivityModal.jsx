import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  CalendarDaysIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { getSubStatusClasses } from "./helpers.js";
import { catalogService, leadService } from "../services/api";

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
    lead?.sub_status || lead?.substatus || "New"
  );

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
        sub_status: subStatus,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDF2FC] text-[#294998]">
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
              <CalendarDaysIcon className="h-3.5 w-3.5 text-[#294998]" />
              <span>Date</span>
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="datetime-local"
              value={activityAt}
              onChange={(e) => setActivityAt(e.target.value)}
              max={todayISO}
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 outline-none transition-all text-slate-800"
            />
            <p className="mt-1 text-[11px] text-slate-400">Cannot be set in the future.</p>
          </div>

          {/* Task 3.6: Activity Type — dynamic dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <TagIcon className="h-3.5 w-3.5 text-[#294998]" />
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
                          ? "bg-[#294998] text-white border-[#294998] shadow-sm"
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
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 outline-none transition-all text-slate-800"
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
                <ArrowPathIcon className="h-3.5 w-3.5 text-[#294998]" />
                <span>Substatus</span>
              </label>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getSubStatusClasses(subStatus)}`}
              >
                {subStatus}
              </span>
            </div>
            <select
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 outline-none transition-all text-slate-800 font-medium"
            >
              {subStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Updates the lead's activity log position. (Task 3.5: only editable here)
            </p>
          </div>

          {/* Task 3.2: Followup Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <ClockIcon className="h-3.5 w-3.5 text-[#294998]" />
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
                    className="text-[11px] font-medium text-[#294998] hover:text-[#1E3776] px-1.5 py-0.5 rounded hover:bg-[#EDF2FC]"
                  >
                    {label}
                  </button>
                ))}
                {followupAt && (
                  <button
                    type="button"
                    onClick={() => setFollowupAt("")}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50"
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
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 outline-none transition-all text-slate-800"
            />
          </div>

          {/* Task 3.2: Remarks (required) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-[#294998]" />
              <span>Remarks</span>
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              placeholder="What was discussed? Next steps..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#294998] hover:bg-[#1E3776] rounded-lg shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
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
    </div>
  );
};

export default ActivityModal;
