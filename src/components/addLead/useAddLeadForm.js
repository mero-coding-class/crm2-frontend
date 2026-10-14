import { useState } from "react";
import { BASE_URL } from "../../config";
import { getTodayDate } from "./helpers.jsx";

// Status choices matching crm2-backend Lead model
export const STATUS_CHOICES = [
  { value: "active", label: "Active" },
  { value: "enrolled", label: "Enrolled" },
  { value: "not_interested", label: "Not Interested" },
];

// Sub-status choices matching crm2-backend SUB_STATUS_CHOICES
export const SUB_STATUS_CHOICES = [
  "New",
  "Contacted",
  "Follow-up",
  "Visit scheduled",
  "Demo scheduled",
  "Proposal sent",
  "Interested",
  "On hold",
];

// Source choices matching crm2-backend (free text, these are UI suggestions)
export const SOURCE_CHOICES = [
  "WhatsApp/Viber",
  "Facebook",
  "Website",
  "Email",
  "Office Visit",
  "Direct call",
  "TikTok",
  "Instagram",
  "Other",
];

export default function useAddLeadForm({ authToken, onClose, onSave, isAdmin }) {
  const [formData, setFormData] = useState({
    // Required fields (crm2-backend LeadCreateSerializer)
    school_name: "",
    district: "",
    municipality: "",
    address: "",
    contact_person: "",
    contact_number: "",
    email: "",
    // Optional fields
    alt_number: "",
    alt_contact_person: "",
    owner: "",           // FK id (integer) — admin only
    call_assignee: "",   // FK id (integer) — admin only
    source: "",
    course_interest: "",
    social_media: "",
    sub_status: "New",
  });

  const [errors, setErrors] = useState({});

  const setField = (name, value) => {
    // sub_status is always "New" on lead creation — only changeable via Activity Log
    if (name === "sub_status") return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev || !prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate required fields per LeadCreateSerializer
    // Task 2.2: contact_number is now optional
    const requiredFields = [
      "school_name",
      "district",
      "municipality",
      "address",
      "contact_person",
      "email",
    ];

    const missing = requiredFields.filter((f) => {
      const v = formData[f];
      if (v === null || v === undefined) return true;
      if (typeof v === "string" && v.trim() === "") return true;
      return false;
    });

    if (missing.length) {
      const e = {};
      missing.forEach((f) => (e[f] = "This field is required"));
      setErrors(e);
      return { ok: false, reason: "validation", missing, first: missing[0] };
    }

    // Build payload matching LeadCreateSerializer fields exactly
    // Task 2.2: contact_number is optional
    const backendPayload = {
      school_name: formData.school_name.trim(),
      district: formData.district.trim(),
      municipality: formData.municipality.trim(),
      address: formData.address.trim(),
      contact_person: formData.contact_person.trim(),
      email: formData.email.trim(),
    };
    if (formData.contact_number?.trim()) backendPayload.contact_number = formData.contact_number.trim();

    // Optional fields — only include if non-empty
    if (formData.alt_number?.trim()) backendPayload.alt_number = formData.alt_number.trim();
    if (formData.alt_contact_person?.trim()) backendPayload.alt_contact_person = formData.alt_contact_person.trim();
    if (formData.source?.trim()) backendPayload.source = formData.source.trim();
    if (formData.course_interest?.trim()) backendPayload.course_interest = formData.course_interest.trim();
    if (formData.social_media?.trim()) backendPayload.social_media = formData.social_media.trim();
    // sub_status is always "New" on lead creation (only changes via Activity Log)
    backendPayload.sub_status = "New";

    // Admin-only: owner and call_assignee (FK PKs)
    if (isAdmin) {
      if (formData.owner) backendPayload.owner = parseInt(formData.owner, 10) || undefined;
      if (formData.call_assignee) backendPayload.call_assignee = parseInt(formData.call_assignee, 10) || undefined;
    }

    // Optimistic save
    try { onSave({ ...backendPayload, _id: `optimistic-${Date.now()}` }); } catch (_) {}
    try { onClose(); } catch (_) {}

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${authToken}`,
      },
      body: JSON.stringify(backendPayload),
    };

    const response = await fetch(`${BASE_URL}/leads/`, requestOptions);
    if (!response.ok) {
      let bodyJson = null;
      let bodyText = null;
      try { bodyJson = await response.json(); } catch { try { bodyText = await response.text(); } catch (_) {} }
      const userMessage = bodyJson ? JSON.stringify(bodyJson) : bodyText || `Status ${response.status}`;
      alert(`Failed to add lead. ${userMessage}`);
      return { ok: false, status: response.status };
    }

    const result = await response.json();
    const serverLead = {
      ...backendPayload,
      id: result.id,
      _id: String(result.id),
      system_id: result.system_id,
      status: result.status,
      sub_status: result.sub_status,
      approval: result.approval,
      created_at: result.created_at,
      updated_at: result.updated_at,
      owner: result.owner,
      owner_username: result.owner_username,
      call_assignee: result.call_assignee,
      call_assignee_username: result.call_assignee_username,
    };

    try { onSave(serverLead); } catch (_) {}
    return { ok: true, data: serverLead };
  };

  return {
    formData,
    setField,
    errors,
    setErrors,
    handleSubmit,
  };
}
