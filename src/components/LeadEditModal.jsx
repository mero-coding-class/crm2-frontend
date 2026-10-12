import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../config";
import { XMarkIcon } from "@heroicons/react/24/outline";
import LeadEditForm from "./LeadEditForm";

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

const LeadEditModal = ({ lead, onClose, onSave }) => {
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

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const { user, authToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Map incoming lead prop → form state using new backend field names
  useEffect(() => {
    if (!lead) return;

    const normalized = {
      id: lead.id ?? "",
      system_id: lead.system_id ?? "",
      // Core writable fields — support legacy aliases from old backend
      school_name:
        lead.school_name ||
        lead.school_college_name ||
        lead.school ||
        "",
      district: lead.district || lead.address_line_2 || "",
      municipality: lead.municipality || lead.address_line_1 || lead.permanentAddress || "",
      address: lead.address || "",
      contact_person:
        lead.contact_person ||
        lead.student_name ||
        lead.studentName ||
        "",
      contact_number:
        lead.contact_number ||
        lead.phone_number ||
        lead.phone ||
        "",
      alt_number: lead.alt_number || "",
      alt_contact_person:
        lead.alt_contact_person ||
        lead.parents_name ||
        lead.parentsName ||
        "",
      email: lead.email || "",
      source: lead.source || "",
      course_interest:
        lead.course_interest ||
        lead.course_name ||
        "",
      social_media:
        lead.social_media ||
        lead.website ||
        lead.adset_name ||
        "",
      sub_status: lead.sub_status || lead.substatus || "New",
      // Read-only display fields
      status: lead.status || "active",
      approval: lead.approval || "approved",
      proposal_status: lead.proposal_status ?? false,
      demo_scheduled: lead.demo_scheduled ?? false,
      owner: lead.owner ?? null,
      owner_username: lead.owner_username || lead.assigned_to_username || lead.assigned_to || "",
      call_assignee: lead.call_assignee ?? null,
      call_assignee_username: lead.call_assignee_username || lead.call_assigned || "",
      created_by: lead.created_by ?? null,
      created_by_username: lead.created_by_username || "",
      created_at: lead.created_at || "",
      updated_at: lead.updated_at || "",
    };

    setFormData({ ...DEFAULT_FORM, ...normalized });
  }, [lead]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Fetch users list (for admin — to allow re-assignment via separate endpoint)
  useEffect(() => {
    const role = (user?.role || "").toLowerCase();
    if (!authToken || !["admin", "superadmin"].includes(role)) return;

    let cancelled = false;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/users/`, {
          headers: { Authorization: `Token ${authToken}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        if (!cancelled) setUsers(list);
      } catch (e) {
        console.warn("LeadEditModal: could not fetch users", e);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [authToken, user]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build PATCH payload — only writable fields per LeadUpdateSerializer
    const updatedData = {
      school_name: formData.school_name,
      district: formData.district,
      municipality: formData.municipality,
      address: formData.address,
      contact_person: formData.contact_person,
      contact_number: formData.contact_number,
      alt_number: formData.alt_number || "",
      alt_contact_person: formData.alt_contact_person || "",
      email: formData.email,
      source: formData.source || "",
      course_interest: formData.course_interest || "",
      social_media: formData.social_media || "",
      sub_status: formData.sub_status || "New",
    };

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
        <LeadEditForm
          formData={formData}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          users={users}
          usersLoading={usersLoading}
          user={user}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default LeadEditModal;
