import React from "react";
import { SUB_STATUS_CHOICES, SOURCE_CHOICES } from "./addLead/useAddLeadForm";

/**
 * LeadEditForm — aligned with crm2-backend LeadUpdateSerializer writable fields:
 *   school_name, district, municipality, address,
 *   contact_person, contact_number, alt_number, alt_contact_person,
 *   email, source, course_interest, social_media, sub_status
 *
 * Read-only display fields are shown but not editable:
 *   system_id, status, approval, proposal_status, demo_scheduled,
 *   owner_username, call_assignee_username, created_at, updated_at
 */

const NEPAL_DISTRICTS = [
  "Kathmandu", "Lalitpur", "Bhaktapur", "Kaski (Pokhara)", "Chitwan",
  "Rupandehi (Butwal)", "Morang (Biratnagar)", "Jhapa", "Sunsari (Dharan)",
  "Banke (Nepalgunj)", "Kailali (Dhangadhi)", "Dhanusha (Janakpur)",
  "Parsa (Birgunj)", "Makwanpur (Hetauda)", "Kavrepalanchok", "Gorkha",
  "Tanahun", "Nawalparasi", "Dang", "Surkhet", "Sindhupalchok",
  "Nuwakot", "Dhading", "Palpa", "Lamjung", "Syangja", "Ilam",
  "Kanchanpur", "Bardiya",
];

// Human-readable status labels for display
const STATUS_DISPLAY = {
  active: "Active",
  enrolled: "Enrolled",
  not_interested: "Not Interested",
};

const APPROVAL_DISPLAY = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const LeadEditForm = ({
  formData,
  onChange,
  onSubmit,
  users = [],
  usersLoading = false,
  user = {},
  onClose,
}) => {
  const isAdmin =
    ["admin", "superadmin"].includes((user?.role || "").toLowerCase());

  const inputClass =
    "mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#294998] focus:border-[#294998] sm:text-sm";
  const readOnlyClass =
    "mt-1 block w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form
      onSubmit={onSubmit}
      className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {/* ── READ-ONLY SECTION ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-sm font-semibold text-gray-500 border-t pt-3 mt-1 uppercase tracking-wider">
        System Info (Read-only)
      </div>

      {/* System ID */}
      <div className="flex flex-col">
        <label className={labelClass}>System ID</label>
        <input
          type="text"
          name="system_id"
          value={formData.system_id || ""}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Status (read-only — changed via dedicated endpoints) */}
      <div className="flex flex-col">
        <label className={labelClass}>Status</label>
        <input
          type="text"
          value={STATUS_DISPLAY[formData.status] || formData.status || ""}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Approval */}
      <div className="flex flex-col">
        <label className={labelClass}>Approval</label>
        <input
          type="text"
          value={APPROVAL_DISPLAY[formData.approval] || formData.approval || ""}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Proposal Sent (backend-set bool) */}
      <div className="flex flex-col">
        <label className={labelClass}>Proposal Sent</label>
        <input
          type="text"
          value={formData.proposal_status ? "Yes" : "No"}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Demo Scheduled (backend-set bool) */}
      <div className="flex flex-col">
        <label className={labelClass}>Demo Scheduled</label>
        <input
          type="text"
          value={formData.demo_scheduled ? "Yes" : "No"}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Owner */}
      <div className="flex flex-col">
        <label className={labelClass}>Lead Owner</label>
        <input
          type="text"
          value={formData.owner_username || ""}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Call Assignee */}
      <div className="flex flex-col">
        <label className={labelClass}>Call Assignee</label>
        <input
          type="text"
          value={formData.call_assignee_username || ""}
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* Created At */}
      <div className="flex flex-col">
        <label className={labelClass}>Created At</label>
        <input
          type="text"
          value={
            formData.created_at
              ? new Date(formData.created_at).toLocaleString()
              : ""
          }
          className={readOnlyClass}
          readOnly
        />
      </div>

      {/* ── EDITABLE SECTION ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-sm font-semibold text-gray-700 border-t pt-3 mt-1 uppercase tracking-wider">
        School / Institution
      </div>

      {/* School Name */}
      <div className="flex flex-col">
        <label htmlFor="school_name" className={labelClass}>
          School Name {isAdmin && <span className="text-rose-500">*</span>}
        </label>
        {isAdmin ? (
          <input
            type="text"
            id="school_name"
            name="school_name"
            value={formData.school_name || ""}
            onChange={onChange}
            className={inputClass}
            placeholder="Full registered school name"
          />
        ) : (
          // Non-admin cannot rename school (enforced by backend too)
          <input
            type="text"
            value={formData.school_name || ""}
            className={readOnlyClass}
            readOnly
            title="Only admins can rename the school"
          />
        )}
      </div>

      {/* District */}
      <div className="flex flex-col">
        <label htmlFor="district" className={labelClass}>
          District <span className="text-rose-500">*</span>
        </label>
        <select
          id="district"
          name="district"
          value={formData.district || ""}
          onChange={onChange}
          className={inputClass}
          required
        >
          <option value="">Select District</option>
          {NEPAL_DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Municipality */}
      <div className="flex flex-col">
        <label htmlFor="municipality" className={labelClass}>
          Municipality <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="municipality"
          name="municipality"
          value={formData.municipality || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="e.g. Kathmandu Metropolitan City"
          required
        />
      </div>

      {/* Address */}
      <div className="flex flex-col sm:col-span-2 lg:col-span-3">
        <label htmlFor="address" className={labelClass}>
          Address <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="Street / Ward / Landmark"
          required
        />
      </div>

      {/* ── CONTACT ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-sm font-semibold text-gray-700 border-t pt-3 mt-1 uppercase tracking-wider">
        Contact Details
      </div>

      {/* Contact Person */}
      <div className="flex flex-col">
        <label htmlFor="contact_person" className={labelClass}>
          Contact Person <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="contact_person"
          name="contact_person"
          value={formData.contact_person || ""}
          onChange={onChange}
          className={inputClass}
          required
        />
      </div>

      {/* Contact Number */}
      <div className="flex flex-col">
        <label htmlFor="contact_number" className={labelClass}>
          Contact Number <span className="text-rose-500">*</span>
        </label>
        <input
          type="tel"
          id="contact_number"
          name="contact_number"
          value={formData.contact_number || ""}
          onChange={onChange}
          className={inputClass}
          required
        />
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label htmlFor="email" className={labelClass}>
          Email <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email || ""}
          onChange={onChange}
          className={inputClass}
          required
        />
      </div>

      {/* Alt Contact Person */}
      <div className="flex flex-col">
        <label htmlFor="alt_contact_person" className={labelClass}>
          Alt. Contact Person
        </label>
        <input
          type="text"
          id="alt_contact_person"
          name="alt_contact_person"
          value={formData.alt_contact_person || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="Secondary contact"
        />
      </div>

      {/* Alt Number (Landline) */}
      <div className="flex flex-col">
        <label htmlFor="alt_number" className={labelClass}>
          Landline Number
        </label>
        <input
          type="tel"
          id="alt_number"
          name="alt_number"
          value={formData.alt_number || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="01-XXXXXXX"
        />
      </div>

      {/* Social Media */}
      <div className="flex flex-col">
        <label htmlFor="social_media" className={labelClass}>
          Social Media / Website
        </label>
        <input
          type="text"
          id="social_media"
          name="social_media"
          value={formData.social_media || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="Facebook, Website URL..."
        />
      </div>

      {/* ── ACTIVITY LOG ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-sm font-semibold text-gray-700 border-t pt-3 mt-1 uppercase tracking-wider">
        Activity Log
      </div>

      {/* Sub Status — read-only, only editable via Activity Log modal */}
      <div className="flex flex-col">
        <label className={labelClass}>Sub Status</label>
        <div className="mt-1 flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
          <span className="text-sm font-semibold text-slate-700">
            {formData.sub_status || "New"}
          </span>
          <span className="text-xs text-gray-400">— editable via Activity Log</span>
        </div>
      </div>

      {/* Source — admin only */}
      {isAdmin && (
      <div className="flex flex-col">
        <label htmlFor="source" className={labelClass}>
          Source
        </label>
        <select
          id="source"
          name="source"
          value={formData.source || ""}
          onChange={onChange}
          className={inputClass}
        >
          <option value="">Select Source</option>
          {SOURCE_CHOICES.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      )}

      {/* Course Interest */}
      <div className="flex flex-col">
        <label htmlFor="course_interest" className={labelClass}>
          Course Interest
        </label>
        <input
          type="text"
          id="course_interest"
          name="course_interest"
          value={formData.course_interest || ""}
          onChange={onChange}
          className={inputClass}
          placeholder="e.g. Robotics, Coding Bootcamp..."
        />
      </div>

      {/* ── ACTIONS ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-4 border-t mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-[#294998] hover:bg-[#1E3776] text-white text-sm font-medium rounded-md shadow-sm transition-colors"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default LeadEditForm;
