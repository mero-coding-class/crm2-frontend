// src/components/ActivityLogViewModal.jsx
// Task 3.4: Eye icon opens a read-only detail view of the activity log
// Shows: Substatus, activity log of each meeting (all historical entries)
// NO editing allowed — read-only. Editing only after clicking "Edit" button.
import React, { useState, useEffect } from "react";
import { XMarkIcon, PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import { getFormattedDate } from "./helpers";
import { BASE_URL } from "../config";

const SUB_STATUS_BADGE = {
  "New": "bg-slate-100 text-slate-600 border-slate-200",
  "Contacted": "bg-blue-50 text-blue-700 border-blue-200",
  "Follow-up": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Visit scheduled": "bg-purple-50 text-purple-700 border-purple-200",
  "Demo scheduled": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Proposal sent": "bg-orange-50 text-orange-700 border-orange-200",
  "Interested": "bg-green-50 text-green-700 border-green-200",
  "On hold": "bg-rose-50 text-rose-700 border-rose-200",
};

const ActivityLogViewModal = ({ lead, authToken, onClose, onEditRequest }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const leadId = lead?.id || lead?._id;
  console.log(lead?.id);
  const subStatus = lead?.sub_status || lead?.substatus || "New";

  useEffect(() => {
    if (!leadId || !authToken) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/activities/?lead=${leadId}`, {
          headers: { Authorization: `Token ${authToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        // Sort newest first
        list.sort((a, b) => new Date(b.activity_at || b.created_at) - new Date(a.activity_at || a.created_at));
        setActivities(list);
      } catch (err) {
        setError(err.message || "Failed to load activity log.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [leadId, authToken]);

  const contactTitle =
    lead?.school_name ||
    lead?.school_college_name ||
    lead?.contact_person ||
    lead?.student_name ||
    "Lead";

  const badgeClass = SUB_STATUS_BADGE[subStatus] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDF2FC] text-[#294998]">
                <EyeIcon className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">Activity Log — View</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                Read Only
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{contactTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Task 3.4: Edit button enables edit mode */}
            {onEditRequest && (
              <button
                type="button"
                onClick={onEditRequest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#294998] text-white hover:bg-[#1E3776] transition-colors"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Task 3.4: Substatus prominently displayed (read-only) */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Substatus</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${badgeClass}`}>
                {subStatus}
              </span>
            </div>
            {lead?.contact_number && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                <p className="text-sm text-slate-700 font-medium">{lead.contact_number}</p>
              </div>
            )}
          </div>

          {/* Task 3.4: Activity Log of each meeting — all historical entries */}
          <div>
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Activity History ({activities.length} entries)
            </h3>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-[#294998]/30 border-t-[#294998] rounded-full animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Loading activities...</span>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {error}
              </div>
            )}

            {!loading && !error && activities.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <EyeIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No activity logs recorded yet.</p>
              </div>
            )}

            {!loading && !error && activities.length > 0 && (
              <div className="space-y-3">
                {activities.map((activity, idx) => {
                  const actSubStatus = activity.sub_status || activity.substatus;
                  const actBadge = SUB_STATUS_BADGE[actSubStatus] || "bg-slate-100 text-slate-600 border-slate-200";
                  const actDate = activity.activity_at || activity.created_at;
                  const followupDate = activity.followup_at;

                  return (
                    <div
                      key={activity.id || idx}
                      className={`p-4 rounded-xl border ${idx === 0 ? "border-[#CDDBF6] bg-[#EDF2FC]/30" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {/* Latest badge */}
                          {idx === 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#294998] text-white">
                              Latest
                            </span>
                          )}
                          {activity.type && (
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {activity.type}
                            </span>
                          )}
                          {actSubStatus && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${actBadge}`}>
                              {actSubStatus}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {actDate ? new Date(actDate).toLocaleString() : "—"}
                        </span>
                      </div>

                      {/* Remarks */}
                      {activity.remarks && (
                        <p className="text-sm text-slate-700 leading-relaxed mb-2">
                          {activity.remarks}
                        </p>
                      )}

                      {/* Details (formerly source) */}
                      {activity.details && (
                        <p className="text-xs text-slate-500 mb-2">
                          <span className="font-semibold">Details:</span> {activity.details}
                        </p>
                      )}

                      {/* Followup Date */}
                      {followupDate && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Followup:</span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {new Date(followupDate).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer — read-only notice */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-[11px] text-slate-400 text-center">
            This view is read-only. Click <strong>Edit</strong> to make changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogViewModal;
