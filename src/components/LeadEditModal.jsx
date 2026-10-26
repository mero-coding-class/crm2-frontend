import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth.js";
import { XMarkIcon } from "@heroicons/react/24/outline";
import LeadEditForm from "./LeadEditForm";
import { leadService } from "../services/api";
import {
  isValidEmail,
  isValidLandlineNumber,
  isValidPhoneNumber,
} from "../utils/validation";

/**
 * LeadEditModal — aligned with crm2-backend Lead model.
 *
 * Backend writable fields (via PATCH /leads/{id}/):
 *   school_name, district, municipality, address,
 *   contact_person, contact_number, alt_number, alt_contact_person,
 *   email, source, course_interest, social_media, sub_status
 *
 * Read-only (backend-set):
 *   id, system_id, proposal_status, demo_scheduled,
 *   status, approval, approval_reason, approved_by, approved_at,
 *   archived, archive_reason, next_year_probability,
 *   owner, call_assignee, created_by, created_at, updated_at
 */

const DEFAULT_FORM = {
    // Identifiers (read-only)
    id: "",
    system_id: "",
    // Writable core fields
    school_name: "",
    district: "",
    municipality: "",
    address: "",
    contact_person: "",
    contact_number: "",
    alt_number: "",
    alt_contact_person: "",
    email: "",
    source: "",
    course_interest: "",
    social_media: "",
    sub_status: "New",
    // Read-only metadata (display only)
    status: "active",
    approval: "approved",
    proposal_status: false,
    demo_scheduled: false,
    owner: null,
    owner_username: "",
    call_assignee: null,
    call_assignee_username: "",
    created_by: null,
    created_by_username: "",
    created_at: "",
    updated_at: "",
};

const isAdminRole = (role) =>
  ["admin", "super admin", "superadmin", "super-admin"].includes(
    String(role || "").toLowerCase()
  );

const LeadEditModal = ({ lead, onClose, onSave }) => {

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const { user, authToken } = useAuth();
  const [leadDetails, setLeadDetails] = useState(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!lead?.id || !authToken) {
      setLoadingLead(false);
      setLoadError("Lead details are unavailable.");
      return undefined;
    }
    let cancelled = false;
    setLoadingLead(true);
    setLoadError("");
    leadService
      .getLead(lead.id, authToken)
      .then((details) => {
        if (!cancelled) setLeadDetails(details);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || "Failed to load lead details.");
      })
      .finally(() => {
        if (!cancelled) setLoadingLead(false);
      });
    return () => { cancelled = true; };
  }, [lead?.id, authToken, reloadToken]);

  // Map incoming lead prop → form state using new backend field names
  useEffect(() => {
    const source = leadDetails || lead;
    if (!source || loadingLead || loadError) return;

    const normalized = {
      id: source.id ?? "",
      system_id: source.system_id ?? "",
      school_name: source.school_name || "",
      district: source.district || "",
      municipality: source.municipality || "",
      address: source.address || "",
      contact_person: source.contact_person || "",
      contact_number: source.contact_number || "",
      alt_number: source.alt_number || "",
      alt_contact_person: source.alt_contact_person || "",
      email: source.email || "",
      source: source.source || "",
      course_interest: source.course_interest || "",
      social_media: source.social_media || "",
      sub_status: source.sub_status || "New",
      // Read-only display fields
      status: source.status || "active",
      approval: source.approval || "approved",
      proposal_status: source.proposal_status ?? false,
      demo_scheduled: source.demo_scheduled ?? false,
      owner: source.owner ?? null,
      owner_username: source.owner_username || "",
      call_assignee: source.call_assignee ?? null,
      call_assignee_username: source.call_assignee_username || "",
      created_by: source.created_by ?? null,
      created_by_username: source.created_by_username || "",
      created_at: source.created_at || "",
      updated_at: source.updated_at || "",
    };

    setFormData({ ...DEFAULT_FORM, ...normalized });
  }, [lead, leadDetails, loadingLead, loadError]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValidationError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const admin = isAdminRole(user?.role);
    const requiredFields = [
      "district", "municipality", "address", "contact_person", "contact_number", "email",
      ...(admin ? ["school_name"] : []),
    ];
    const missingField = requiredFields.find((field) => !String(formData[field] || "").trim());
    if (missingField) {
      setValidationError(`${missingField.replaceAll("_", " ")} is required.`);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setValidationError("Enter a valid email address.");
      return;
    }
    if (!isValidPhoneNumber(formData.contact_number)) {
      setValidationError("Enter a contact number with exactly 10 local digits. +977 is accepted.");
      return;
    }
    if (formData.alt_number && !isValidLandlineNumber(formData.alt_number)) {
      setValidationError("Enter a landline number with 7 to 10 local digits.");
      return;
    }
    const maxLengths = {
      school_name: 255, district: 100, municipality: 100, address: 255,
      contact_person: 255, contact_number: 32, alt_number: 32,
      alt_contact_person: 255, email: 254, source: 100,
      course_interest: 255, social_media: 500,
    };
    const tooLong = Object.entries(maxLengths).find(([field, limit]) =>
      String(formData[field] || "").length > limit
    );
    if (tooLong) {
      setValidationError(`${tooLong[0].replaceAll("_", " ")} must be ${tooLong[1]} characters or fewer.`);
      return;
    }
    setValidationError("");

    const updatedData = {
      id: formData.id,
      district: formData.district,
      municipality: formData.municipality,
      address: formData.address,
      contact_person: formData.contact_person,
      contact_number: formData.contact_number,
      alt_number: formData.alt_number || "",
      alt_contact_person: formData.alt_contact_person || "",
      email: formData.email,
      course_interest: formData.course_interest || "",
      social_media: formData.social_media || "",
      sub_status: formData.sub_status || "New",
    };
    if (admin) {
      updatedData.school_name = formData.school_name;
      updatedData.source = formData.source || "";
    }

    onSave(updatedData);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-4"
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        {loadingLead ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading lead details…</div>
        ) : loadError ? (
          <div className="space-y-4 p-8 text-center">
            <p className="text-sm text-rose-700">{loadError}</p>
            <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="rounded-md bg-[#294998] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3776]">Retry</button>
          </div>
        ) : (
          <LeadEditForm
            formData={formData}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            validationError={validationError}
            user={user}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default LeadEditModal;
