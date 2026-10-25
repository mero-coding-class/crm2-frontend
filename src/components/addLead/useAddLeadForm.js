import { useState } from "react";
import { leadService } from "../../services/api";

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
    const requiredFields = [
      "school_name",
      "district",
      "municipality",
      "address",
      "contact_person",
      "contact_number",
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
    const backendPayload = {
      school_name: formData.school_name.trim(),
      district: formData.district.trim(),
      municipality: formData.municipality.trim(),
      address: formData.address.trim(),
      contact_person: formData.contact_person.trim(),
      contact_number: formData.contact_number.trim(),
      email: formData.email.trim(),
    };

    // Optional fields — only include if non-empty
    if (formData.alt_number?.trim()) backendPayload.alt_number = formData.alt_number.trim();
    if (formData.alt_contact_person?.trim()) backendPayload.alt_contact_person = formData.alt_contact_person.trim();
    if (formData.source?.trim()) backendPayload.source = formData.source.trim();
    if (formData.course_interest?.trim()) backendPayload.course_interest = formData.course_interest.trim();
    if (formData.social_media?.trim()) backendPayload.social_media = formData.social_media.trim();
    // Owner is assignable during creation by admins. Call assignee is set through
    // the dedicated assignment action after the lead exists.
    if (isAdmin) {
      if (formData.owner) backendPayload.owner = parseInt(formData.owner, 10) || undefined;
    }

    try {
      const serverLead = await leadService.createLead(backendPayload, authToken);
      await onSave(serverLead);
      onClose();
      return { ok: true, data: serverLead };
    } catch (error) {
      const message = error?.message || "Failed to add lead.";
      setErrors((prev) => ({ ...prev, general: message }));
      return { ok: false, reason: message };
    }
  };

  return {
    formData,
    setField,
    errors,
    setErrors,
    handleSubmit,
  };
}
