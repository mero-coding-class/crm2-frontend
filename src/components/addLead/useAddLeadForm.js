import { useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../../config";
import { getTodayDate, formatDateForBackend } from "./helpers.jsx";

export default function useAddLeadForm({ courses = [], authToken, onClose, onSave, isAdmin, usersApi }) {
  const [formData, setFormData] = useState({
    school_college_name: "",
    district: "",
    municipality: "",
    contact_person: "",
    contact_number: "",
    email: "",
    website: "",
    assigned_to: "",
    call_assigned: "",
    proposal_status: "Draft",
    status: "New",
    sub_status: "Follow-up Needed",
    activity: "Phone Call",
    add_date: getTodayDate(),
    next_call: "",
    demo_scheduled: false,
    remarks: "",
    student_name: "",
    parents_name: "",
    phone_number: "",
    whatsapp_number: "",
    age: "",
    grade: "",
    source: "Phone Call",
    course_name: "",
    course_duration: "",
    class_type: "",
    course_type: "",
    shift: "",
    lead_type: "Draft",
    previous_coding_experience: "",
    last_call: "",
    value: "",
    adset_name: "",
    payment_type: "",
    device: "",
    workshop_batch: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    post_code: "",
    first_installment: "",
    first_invoice: null,
  });

  const [errors, setErrors] = useState({});

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev || !prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const selectedCourse = useMemo(() => {
    if (!Array.isArray(courses)) return null;
    return courses.find(
      (c) => String(c.id) === String(formData.course_name) || String(c.id) === String(formData.course)
    );
  }, [courses, formData.course_name, formData.course]);

  const handleSubmit = async () => {
    // Validate required fields from the design (school_college_name, contact_person, contact_number)
    const requiredFieldsList = [
      "school_college_name",
      "contact_person",
      "contact_number",
    ];
    const missing = requiredFieldsList.filter((f) => {
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

    if (formData.status === "Converted" && !formData.first_invoice) {
      setErrors({ first_invoice: "Invoice is required for Converted status" });
      alert("Invoice is required when setting status to 'Converted'");
      return { ok: false, reason: "invoice" };
    }

    const tempId = `new-${Date.now()}`;

    const selectedCourseId = selectedCourse ? selectedCourse.id : null;
    const phoneVal = String(formData.contact_number || formData.phone_number || "").trim();

    const backendPayload = {
      _id: tempId,
      school_college_name: (formData.school_college_name || "").trim(),
      student_name: (formData.contact_person || formData.student_name || formData.school_college_name || "").trim(),
      parents_name: (formData.parents_name || "").trim(),
      email: (formData.email || "").trim(),
      phone_number: phoneVal,
      whatsapp_number: phoneVal,
      age: formData.age || "",
      grade: formData.grade || "",
      source: formData.activity || formData.source || "Phone Call",
      class_type: formData.class_type || "Physical",
      shift: formData.shift ? String(formData.shift).trim() : "",
      status: formData.status || "New",
      substatus: formData.sub_status || "Follow-up Needed",
      device: formData.device || "Yes",
      previous_coding_experience: formData.previous_coding_experience || "None",
      address_line_1: formData.municipality || formData.address_line_1 || "",
      address_line_2: formData.district || formData.address_line_2 || "",
      city: formData.district || formData.city || "",
      county: formData.county || "",
      post_code: formData.post_code || "",
      value: formData.value || "",
      adset_name: formData.website || formData.adset_name || "",
      remarks: formData.remarks || "",
      payment_type: formData.payment_type || "",
      workshop_batch: formData.workshop_batch || "",
      lead_type: formData.proposal_status || formData.lead_type || "Draft",
      demo_scheduled: formData.demo_scheduled ? "Yes" : "No",
      scheduled_taken: formData.demo_scheduled ? "Yes" : "No",
      assigned_to: formData.assigned_to || "",
      assigned_to_username: formData.assigned_to || "",
      course: selectedCourseId,
      course_name: selectedCourse?.course_name ?? formData.course_name ?? "General",
      course_duration: formData.course_duration || "",
      last_call: formatDateForBackend(formData.last_call),
      next_call: formatDateForBackend(formData.next_call),
      add_date: formData.add_date || getTodayDate(),
      first_installment: formData.first_installment ? parseFloat(formData.first_installment) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove empty optional keys
    const optionalKeys = [
      // Newly optional fields
      "student_name",
      "parents_name",
      "email",
      "age",
      "grade",
      "class_type",
      "grade",
      "source",
      "class_type",
      "shift",
      "payment_type",
      "device",
      "previous_coding_experience",
      "school_college_name",
      "demo_scheduled",
      "lead_type",
    ];
    optionalKeys.forEach((k) => {
      if (backendPayload[k] === "" || backendPayload[k] === null || backendPayload[k] === undefined) {
        delete backendPayload[k];
      }
    });
    if (!backendPayload.last_call) delete backendPayload.last_call;
    if (!backendPayload.next_call) delete backendPayload.next_call;

    // Optimistic save
    try { onSave(backendPayload); } catch (_) {}
    try { onClose(); } catch (_) {}

    // Build request options
    let requestOptions;
    if (formData.first_invoice) {
      const formDataToSend = new FormData();
      Object.entries(backendPayload).forEach(([k, v]) => {
        if (v !== null && v !== undefined) formDataToSend.append(k, v);
      });
      formDataToSend.append("first_invoice", formData.first_invoice);
      requestOptions = { method: "POST", headers: { Authorization: `Token ${authToken}` }, body: formDataToSend };
    } else {
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${authToken}` },
        body: JSON.stringify(backendPayload),
      };
    }

    const response = await fetch(`${BASE_URL}/leads/`, requestOptions);
    if (!response.ok) {
      let bodyText = null; let bodyJson = null;
      try { bodyJson = await response.json(); } catch { try { bodyText = await response.text(); } catch (e2) { bodyText = `<unreadable: ${e2}>`; } }
      const userMessage = bodyJson ? JSON.stringify(bodyJson) : bodyText || `Status ${response.status}`;
      alert(`Failed to add lead. ${userMessage}`);
      return { ok: false, status: response.status };
    }

    const result = await response.json();
    const serverLead = {
      ...backendPayload,
      _id: String(result.id),
      id: result.id,
      created_at: result.created_at || backendPayload.created_at,
      updated_at: result.updated_at || backendPayload.updated_at,
      course_name: result.course_name ?? backendPayload.course_name,
      course: result.course ?? backendPayload.course,
      substatus: result.substatus ?? result.sub_status ?? backendPayload.substatus,
      sub_status: result.sub_status ?? result.substatus ?? backendPayload.sub_status,
      course_duration: result.course_duration ?? backendPayload.course_duration,
      logs_url: `${BASE_URL}/leads/${result.id}/logs/`,
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
