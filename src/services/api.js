// src/services/api.js

import { BASE_URL } from "../config";

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMsg = "An error occurred";
    try {
      const errData = await response.json();
      errorMsg = errData.detail || JSON.stringify(errData);
    } catch {
      try {
        errorMsg = await response.text();
      } catch {
        // ignore
      }
    }
    if (
      response.status === 401 ||
      (response.status === 403 &&
        typeof errorMsg === "string" &&
        (errorMsg.includes("Authentication credentials") || errorMsg.includes("Invalid token")))
    ) {
      // Dispatch a custom event so AuthContext can clear React state properly
      // (direct localStorage.removeItem won't trigger re-render in the same tab)
      try {
        window.dispatchEvent(new CustomEvent("crm:authExpired"));
      } catch (_) {}
    }
    throw new Error(errorMsg);
  }
  // Some endpoints may return 204 No Content — handle that gracefully.
  if (response.status === 204) return {};
  // If there's no body, return an empty object to avoid parse errors
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    // fallback to original behavior
    return text;
  }
};

/**
 * apiFetch — thin wrapper around fetch() that always sends session cookies
 * (credentials: "include"). Required because the backend uses Django session
 * auth (not DRF Token auth). Pass the same args as fetch().
 */
export const apiFetch = (url, options = {}) => {
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: options.headers || {},
  });
};


// Format date for API: backend expects YYYY-MM-DD for date fields like last_call/next_call.
const formatDateForApi = (d) => {
  if (!d && d !== 0) return null;
  // Date object -> YYYY-MM-DD
  if (d instanceof Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // If already a string in YYYY-MM-DD, return it
  const s = String(d).trim();
  const parts = s.split("-");
  if (parts.length === 3 && parts[0].length === 4) return s;

  // If input was in backend-old format 'YYYY|DD|MM', convert to YYYY-MM-DD
  if (s.includes("|")) {
    const parts2 = s.split("|");
    if (parts2.length === 3) {
      const [yyyy, dd, mm] = parts2;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }

  // Fallback: try Date parse and format
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

// Accept free-text shift values from the UI. Return undefined only when the
// incoming value is strictly undefined or null; otherwise return the trimmed string.
const sanitizeShift = (s) => {
  if (s === undefined || s === null) return undefined;
  return String(s).trim();
};

export const leadService = {
  getLeads: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/`, {
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
    });
    const backendLeads = await handleResponse(response);
    // Normalize backend response to an array. Some backends return
    // a paginated object like { results: [...] } while others return []
    const leadsList = Array.isArray(backendLeads)
      ? backendLeads
      : backendLeads?.results || [];

    // Normalize crm2-backend LeadSummarySerializer / LeadDetailSerializer fields
    return leadsList.map((lead) => ({
      id: lead.id,
      _id: String(lead.id),
      system_id: lead.system_id || "",
      school_name: lead.school_name || "",
      district: lead.district || "",
      municipality: lead.municipality || "",
      address: lead.address || "",
      contact_person: lead.contact_person || "",
      contact_number: lead.contact_number || "",
      alt_number: lead.alt_number || "",
      alt_contact_person: lead.alt_contact_person || "",
      email: lead.email || "",
      source: lead.source || "",
      course_interest: lead.course_interest || "",
      social_media: lead.social_media || "",
      status: lead.status || "active",
      sub_status: lead.sub_status || "New",
      approval: lead.approval || "approved",
      proposal_status: lead.proposal_status ?? false,
      demo_scheduled: lead.demo_scheduled ?? false,
      owner: lead.owner ?? null,
      owner_username: lead.owner_username || "",
      call_assignee: lead.call_assignee ?? null,
      call_assignee_username: lead.call_assignee_username || "",
      created_by: lead.created_by ?? null,
      created_by_username: lead.created_by_username || "",
      created_at: lead.created_at || "",
      updated_at: lead.updated_at || "",
      archived: lead.archived ?? false,
      archive_reason: lead.archive_reason || "",
      next_year_probability: lead.next_year_probability ?? null,
    }));
  },

  // Fetch a specific page of leads from the backend (supports paginated API)
  getLeadsPage: async (authToken, page = 1, pageSize = 20) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const url = `${BASE_URL}/leads/?page=${page}&page_size=${pageSize}`;
    const resp = await apiFetch(url, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const json = await handleResponse(resp);

    // Normalize response: backend may return { results: [...], count }
    const list = Array.isArray(json) ? json : json?.results || [];
    const count = json && typeof json === "object" && (json.count || json.total || null);
    const totalPages = count
      ? Math.max(1, Math.ceil(count / pageSize))
      : Math.max(1, Math.ceil((list.length || 0) / pageSize));

    const mapped = (list || []).map((lead) => ({
      id: lead.id,
      _id: String(lead.id),
      system_id: lead.system_id || "",
      school_name: lead.school_name || "",
      district: lead.district || "",
      municipality: lead.municipality || "",
      address: lead.address || "",
      contact_person: lead.contact_person || "",
      contact_number: lead.contact_number || "",
      alt_number: lead.alt_number || "",
      alt_contact_person: lead.alt_contact_person || "",
      email: lead.email || "",
      source: lead.source || "",
      course_interest: lead.course_interest || "",
      social_media: lead.social_media || "",
      status: lead.status || "active",
      sub_status: lead.sub_status || "New",
      approval: lead.approval || "approved",
      proposal_status: lead.proposal_status ?? false,
      demo_scheduled: lead.demo_scheduled ?? false,
      owner: lead.owner ?? null,
      owner_username: lead.owner_username || "",
      call_assignee: lead.call_assignee ?? null,
      call_assignee_username: lead.call_assignee_username || "",
      created_by: lead.created_by ?? null,
      created_by_username: lead.created_by_username || "",
      created_at: lead.created_at || "",
      updated_at: lead.updated_at || "",
      archived: lead.archived ?? false,
      archive_reason: lead.archive_reason || "",
      next_year_probability: lead.next_year_probability ?? null,
    }));

    return { results: mapped, count: count || null, totalPages };
  },

  updateLead: async (id, updates, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");

    // Only send fields that are writable by LeadUpdateSerializer
    const WRITABLE_FIELDS = [
      "school_name", "district", "municipality", "address",
      "contact_person", "contact_number", "alt_number", "alt_contact_person",
      "email", "source", "course_interest", "social_media", "sub_status",
    ];

    const backendUpdates = {};

    WRITABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        backendUpdates[field] = updates[field];
      }
    });

    // Support legacy alias mapping from old frontend field names
    if (updates.school_college_name !== undefined && !backendUpdates.school_name)
      backendUpdates.school_name = updates.school_college_name;
    if (updates.contact_number !== undefined) backendUpdates.contact_number = updates.contact_number;
    if (updates.phone_number !== undefined && !backendUpdates.contact_number)
      backendUpdates.contact_number = updates.phone_number;
    if (updates.social_media !== undefined) backendUpdates.social_media = updates.social_media;
    if (updates.website !== undefined && !backendUpdates.social_media)
      backendUpdates.social_media = updates.website;
    if (updates.course_interest !== undefined) backendUpdates.course_interest = updates.course_interest;
    if (updates.substatus !== undefined && !backendUpdates.sub_status)
      backendUpdates.sub_status = updates.substatus;
    if (updates.alt_contact_person !== undefined) backendUpdates.alt_contact_person = updates.alt_contact_person;
    if (updates.alt_number !== undefined) backendUpdates.alt_number = updates.alt_number;

    const doPatch = async (payload) => {
      const hasInvoiceFile =
        updates && updates.first_invoice && updates.first_invoice instanceof File;

      let resp;
      if (hasInvoiceFile) {
        const fd = new FormData();
        Object.entries(payload || {}).forEach(([k, v]) => {
          if (k === "first_invoice") return;
          if (v === undefined || v === null) return;
          if (typeof v === "object") {
            try { fd.append(k, JSON.stringify(v)); } catch { fd.append(k, String(v)); }
          } else {
            fd.append(k, String(v));
          }
        });
        fd.append("first_invoice", updates.first_invoice);
        resp = await apiFetch(`${BASE_URL}/leads/${id}/`, {
          method: "PATCH",
          headers: { Authorization: `Token ${authToken}` },
          body: fd,
        });
      } else {
        resp = await apiFetch(`${BASE_URL}/leads/${id}/`, {
          method: "PATCH",
          headers: {
            Authorization: `Token ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        let text;
        try { text = await resp.text(); } catch (e) { text = `<could not read response body: ${e.message}>`; }
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        console.error("leadService.updateLead -> PATCH failed", {
          url: `${BASE_URL}/leads/${id}/`,
          id,
          payload,
          status: resp.status,
          responseBody: parsed,
        });
        const errMsg =
          (parsed && parsed.detail) ||
          (typeof parsed === "string" && parsed) ||
          JSON.stringify(parsed);
        throw new Error(errMsg || `HTTP ${resp.status}`);
      }

      return await handleResponse(resp);
    };

    const data = await doPatch(backendUpdates);

    const serverData = data && typeof data === "object" ? data : {};
    const merged = { ...(serverData || {}), ...(backendUpdates || {}) };
    merged.id = serverData.id || serverData._id || id;
    merged._id = serverData._id || serverData.id || merged._id || id;

    const requestHadLast = "recentCall" in updates || "last_call" in updates;
    const requestHadNext = "nextCall" in updates || "next_call" in updates;
    if (!("last_call" in serverData) && !requestHadLast) delete merged.last_call;
    if (!("next_call" in serverData) && !requestHadNext) delete merged.next_call;

    merged.substatus =
      merged.substatus ||
      merged.sub_status ||
      backendUpdates.substatus ||
      backendUpdates.sub_status ||
      "New";
    merged.sub_status = merged.sub_status || merged.substatus;

    try {
      window.dispatchEvent(new CustomEvent("crm:leadUpdated", { detail: { lead: merged } }));
      if (backendUpdates && backendUpdates.remarks !== undefined) {
        try {
          window.dispatchEvent(
            new CustomEvent("crm:remarkUpdated", {
              detail: { id: merged.id || null, remarks: backendUpdates.remarks },
            })
          );
        } catch (_) {}
      }
    } catch (e) {
      console.warn("Could not dispatch crm:leadUpdated event", e);
    }

    return merged;
  },

  addLead: async (newLeadData, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");

    const backendData = {
      school_name: newLeadData.school_name || newLeadData.school_college_name || "",
      district: newLeadData.district || "",
      municipality: newLeadData.municipality || "",
      address: newLeadData.address || "",
      contact_person: newLeadData.contact_person || "",
      contact_number: newLeadData.contact_number || newLeadData.phone_number || "",
      alt_number: newLeadData.alt_number || "",
      alt_contact_person: newLeadData.alt_contact_person || "",
      email: newLeadData.email || "",
      source: newLeadData.source || "",
      course_interest: newLeadData.course_interest || "",
      social_media: newLeadData.social_media || "",
      sub_status: newLeadData.sub_status || newLeadData.substatus || "New",
      ...(newLeadData.owner !== undefined ? { owner: newLeadData.owner } : {}),
    };

    const response = await apiFetch(`${BASE_URL}/leads/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendData),
    });
    return handleResponse(response);
  },

  /** Archive a single lead (soft-delete). Requires reason + next_year_probability (bool). */
  archiveLead: async (id, authToken, reason = "", nextYearProbability = false) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/archive/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason, next_year_probability: !!nextYearProbability }),
    });
    return handleResponse(response);
  },

  /** Restore an archived lead back to the active pipeline. */
  restoreLead: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/restore/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    return handleResponse(response);
  },

  /** Archive multiple leads in one round-trip. Body: {ids[], reason, next_year_probability}. */
  bulkArchiveLeads: async (ids, authToken, reason = "", nextYearProbability = false) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/bulk-archive/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids, reason, next_year_probability: !!nextYearProbability }),
    });
    return handleResponse(response);
  },

  /** Assign owner and/or call_assignee to a lead. */
  assignLead: async (id, { owner, call_assignee, reason } = {}, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const body = {};
    if (owner !== undefined) body.owner = owner;
    if (call_assignee !== undefined) body.call_assignee = call_assignee;
    if (reason) body.reason = reason;
    const response = await apiFetch(`${BASE_URL}/leads/${id}/assign/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /** Fetch canonical sub-status choices from the backend. */
  getSubStatusChoices: async (authToken) => {
    if (!authToken) return [];
    try {
      const response = await apiFetch(`${BASE_URL}/leads/sub-status-choices/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      return handleResponse(response);
    } catch {
      return [];
    }
  },

  /** Fetch paginated archived leads. */
  getArchivedLeads: async (authToken, page = 1, pageSize = 20, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams({ page, page_size: pageSize, ...params }).toString();
    const response = await apiFetch(`${BASE_URL}/archived-leads/?${qs}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const json = await handleResponse(response);
    const list = Array.isArray(json) ? json : json?.results || [];
    const count = json?.count || null;
    const totalPages = count
      ? Math.max(1, Math.ceil(count / pageSize))
      : 1;
    return { results: list, count, totalPages };
  },
};

// Resolve a backend server id for a lead-like object or id value.
export const resolveServerId = (leadOrId, prevLeads = []) => {
  if (leadOrId === null || leadOrId === undefined) return null;

  if (typeof leadOrId === "string" || typeof leadOrId === "number") {
    const s = String(leadOrId);
    if (s.startsWith("lead-")) return null;
    if (/^\d+$/.test(s)) return Number(s);
    return s;
  }

  const lead = leadOrId || {};
  if (lead.id !== undefined && lead.id !== null) return lead.id;
  if (lead._id !== undefined && lead._id !== null) {
    const s = String(lead._id);
    if (!s.startsWith("lead-")) {
      if (/^\d+$/.test(s)) return Number(s);
      return s;
    }
  }

  try {
    if (Array.isArray(prevLeads) && prevLeads.length) {
      const match = prevLeads.find(
        (l) =>
          (l.email && lead.email && l.email === lead.email) ||
          (l.phone_number && lead.phone_number && l.phone_number === lead.phone_number) ||
          (l.phone && lead.phone && l.phone === lead.phone) ||
          (l.student_name && lead.student_name && l.student_name === lead.student_name)
      );
      if (match) {
        if (match.id !== undefined && match.id !== null) return match.id;
        if (match._id !== undefined && match._id !== null) {
          const ms = String(match._id);
          if (!ms.startsWith("lead-")) return /^\d+$/.test(ms) ? Number(ms) : ms;
          return match._id;
        }
      }
    }
  } catch (_) {}

  return null;
};

export const trashService = {
  /** Fetch paginated archived/trashed leads from the new backend. */
  getTrashedLeads: async (authToken, page = 1, pageSize = 50) => {
    if (!authToken) throw new Error("Authentication token not found.");
    try {
      const qs = new URLSearchParams({ page, page_size: pageSize }).toString();
      const response = await apiFetch(`${BASE_URL}/archived-leads/?${qs}`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (response.status === 404) return [];
      const json = await handleResponse(response);
      const list = Array.isArray(json) ? json : json?.results || [];
      return list.map((lead) => ({
        id: lead.id,
        _id: String(lead.id),
        system_id: lead.system_id || "",
        student_name: lead.school_name || lead.student_name || "",
        school_name: lead.school_name || "",
        parents_name: lead.contact_person || lead.parents_name || "",
        email: lead.email || "",
        phone_number: lead.contact_number || lead.phone_number || "",
        whatsapp_number: lead.alt_number || lead.whatsapp_number || "",
        district: lead.district || "",
        municipality: lead.municipality || "",
        address: lead.address || "",
        source: lead.source || "",
        course_name: lead.course_interest || lead.course_name || "",
        status: lead.status || "archived",
        sub_status: lead.sub_status || "",
        archived: lead.archived ?? true,
        archive_reason: lead.archive_reason || "",
        created_at: lead.created_at || "",
        updated_at: lead.updated_at || "",
        owner_username: lead.owner_username || "",
        assigned_to: lead.call_assignee_username || "",
        changeLog: [],
      }));
    } catch {
      return [];
    }
  },

  /** Restore an archived lead back to the active pipeline. */
  restoreTrashedLead: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/restore/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    return handleResponse(response);
  },

  /**
   * Delete button handler — backend blocks hard DELETE (405 by design), so the
   * Delete button maps to soft-archive instead. Keeps the button in the UI.
   */
  deleteTrashedLead: async (id, authToken, reason = "Deleted from trash view", nextYearProbability = false) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/archive/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason, next_year_probability: !!nextYearProbability }),
    });
    if (!response.ok) {
      // Already archived -> backend may return 400; treat as success (stays in archive).
      if (response.status === 400 || response.status === 404) return {};
      let errorMsg = "Failed to archive lead";
      try {
        const errData = await response.json();
        errorMsg = errData.detail || JSON.stringify(errData);
      } catch {
        try { errorMsg = await response.text(); } catch { /* ignore */ }
      }
      throw new Error(errorMsg);
    }
    return handleResponse(response);
  },
};

export const courseService = {
  /** Fetch all catalog classes (replaces old /api/courses/). */
  getCourses: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    try {
      const response = await apiFetch(`${BASE_URL}/catalogs/classes/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (response.status === 404) return [];
      const data = await handleResponse(response);
      // Normalize to [{id, course_name}] shape the rest of the UI expects
      const list = Array.isArray(data) ? data : data?.results || [];
      return list.map((c) => ({
        id: c.id,
        course_name: c.class_name || c.name || c.title || "",
        ...c,
      }));
    } catch {
      return [];
    }
  },

  createCourse: async (courseName, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ class_name: courseName, name: courseName }),
    });
    return handleResponse(response);
  },

  updateCourse: async (id, courseName, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ class_name: courseName, name: courseName }),
    });
    return handleResponse(response);
  },

  deleteCourse: async (id, authToken) => {
    // Backend blocks DELETE on catalogs (405) — deactivate via active=false instead.
    // Button label stays "Delete"; behavior becomes deactivate.
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active: false }),
    });
    if (!response.ok) {
      let errorMsg = "Failed to deactivate course";
      try {
        const data = await response.json();
        errorMsg = data.detail || JSON.stringify(data);
      } catch (e) {
        try { errorMsg = await response.text(); } catch { /* ignore */ }
      }
      throw new Error(errorMsg);
    }
    return handleResponse(response);
  },
};

export const changeLogService = {
  getLeadLogs: async (leadId, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    // Canonical audit endpoint: GET /change-log/?entity=&record_id=
    // (There is no /leads/{id}/logs/ route on the backend.)
    const qs = new URLSearchParams({ entity: "leads", record_id: leadId }).toString();
    const response = await apiFetch(`${BASE_URL}/change-log/?${qs}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const payload = await handleResponse(response);
    const logs = Array.isArray(payload) ? payload : payload?.results || [];
    return logs.sort((a, b) => new Date(b.at || b.timestamp) - new Date(a.at || a.timestamp));
  },
};

// ─── Approval Queue Service (admin only) ──────────────────────────────────────
export const approvalService = {
  /** Get pending approval queue (admin only). */
  getQueue: async (authToken, page = 1, pageSize = 20) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams({ page, page_size: pageSize }).toString();
    const response = await apiFetch(`${BASE_URL}/approvals/?${qs}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return { results: Array.isArray(data) ? data : data?.results || [], count: data?.count || 0 };
  },

  /** Approve a pending lead submission. */
  approveLead: async (id, reason, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/approve/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /** Reject a pending lead submission. */
  rejectLead: async (id, reason, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/reject/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /** Batch approve or reject. action = 'approve' | 'reject'. */
  batchReview: async (ids, action, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/approvals/batch/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    return handleResponse(response);
  },
};

// ─── Import Service (bulk lead import: preview → confirm) ─────────────────────
export const importService = {
  /**
   * Bulk import step 1 (admin+B2B): upload csv/xlsx as 'file' -> mapping +
   * per-row valid/invalid/duplicate_in_file/duplicate_in_db + batch_key.
   */
  uploadBatch: async (file, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const fd = new FormData();
    fd.append("file", file);
    const response = await apiFetch(`${BASE_URL}/leads/import/preview/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}` },
      body: fd,
    });
    return handleResponse(response);
  },

  /**
   * Bulk import step 2: create only selected valid rows from batch_key
   * (admin may set owner; B2B -> pending). Links ImportBatch.
   */
  confirmImport: async ({ batch_key, rows, owner } = {}, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const body = { batch_key };
    if (rows !== undefined) body.rows = rows;
    if (owner !== undefined) body.owner = owner;
    const response = await apiFetch(`${BASE_URL}/leads/import/confirm/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /** No dedicated batch detail endpoint in backend spec; kept as stub. */
  getBatch: async (batchId, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    console.warn(`importService.getBatch(${batchId}): no backend route; returning null.`);
    return null;
  },

  /** No batch-list endpoint in backend spec; kept as stub. */
  listBatches: async (authToken, page = 1) => {
    if (!authToken) throw new Error("Authentication token not found.");
    console.warn("importService.listBatches: no backend route; returning empty list.");
    return { results: [], count: 0 };
  },
};

// ─── Activity Service ────────────────────────────────────────────────────────
export const activityService = {
  /** List activities for a lead (paginated). */
  getActivities: async (leadId, authToken, page = 1) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams({ lead: leadId, page }).toString();
    const response = await apiFetch(`${BASE_URL}/activities/?${qs}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return { results: Array.isArray(data) ? data : data?.results || [], count: data?.count || 0 };
  },

  /** Log a new activity on a lead. */
  createActivity: async (payload, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/activities/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  /** Edit an existing activity (patch). */
  updateActivity: async (id, updates, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/activities/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },
};

// ─── Task Service ────────────────────────────────────────────────────────────
export const taskService = {
  /** Get tasks (optionally filtered by lead, status, due range). */
  getTasks: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/tasks/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return { results: Array.isArray(data) ? data : data?.results || [], count: data?.count || 0 };
  },

  /** Update a task status/due date. */
  updateTask: async (id, updates, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/tasks/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },
};

// ─── Demo Service ────────────────────────────────────────────────────────────
export const demoService = {
  /** List demos (role-scoped). Supports params: lead, demo_status, academic, from, to, unassigned */
  getDemos: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/demos/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    const list = Array.isArray(data) ? data : data?.results || [];
    return { results: list, count: data?.count || list.length };
  },

  /** Schedule a new demo. */
  createDemo: async (payload, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  /** Update a demo (reschedule, status, etc.). */
  updateDemo: async (id, updates, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  /** Admin-only: assign an academic to a demo. */
  assignDemo: async (id, { academic, reason }, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/${id}/assign/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ academic, reason }),
    });
    return handleResponse(response);
  },

  /** Submit feedback for a completed demo (academic or admin). */
  submitFeedback: async (id, feedbackData, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/${id}/feedback/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(feedbackData),
    });
    return handleResponse(response);
  },
};

// ─── Dashboard Service ───────────────────────────────────────────────────────
export const dashboardService = {
  /** Dashboard payload: today/tomorrow/next7days/overdue tasks, demo_queue, notifications count. */
  getDashboard: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/dashboard/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  /** Calendar data for a date range (?from=YYYY-MM-DD&to=YYYY-MM-DD). */
  getCalendar: async (authToken, from, to) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/calendar/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },
};

// ─── Notification Service ────────────────────────────────────────────────────
export const notificationService = {
  /** Get notifications (own only). Pass { unread: true } to filter unread. */
  getNotifications: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/notifications/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return { results: Array.isArray(data) ? data : data?.results || [], count: data?.count || 0 };
  },

  /** Mark a single notification as read. */
  markRead: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/notifications/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    });
    return handleResponse(response);
  },
};

// ─── Audit Service ────────────────────────────────────────────────────────────
export const auditService = {
  /** Query change-log. Params: entity, record_id, actor, from, to */
  getChangeLogs: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/change-log/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return { results: Array.isArray(data) ? data : data?.results || [], count: data?.count || 0 };
  },

  getLeadChangeLogs: async (leadId, authToken) =>
    auditService.getChangeLogs(authToken, { entity: "leads", record_id: leadId }),
};

// ─── Report Service ──────────────────────────────────────────────────────────
export const reportService = {
  /**
   * Summary report metrics.
   * Params: from, to, district, municipality, owner, export ('csv'|'xlsx')
   * Returns JSON by default; Blob when export param is set.
   */
  getSummary: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/reports/summary/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    if (params.export) return response.blob();
    return handleResponse(response);
  },

  /**
   * Filtered lead rows for the report table/export.
   * Params: from, to, district, municipality, owner, export ('csv'|'xlsx')
   */
  getLeadRows: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/reports/leads/${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    if (params.export) return response.blob();
    return handleResponse(response);
  },

  /**
   * Full dataset dump.
   * dataset: 'leads' | 'activities' | 'tasks' | 'clients' | 'contracts'
   * format:  'csv' | 'xlsx'
   */
  exportDataset: async (authToken, dataset, format = "csv") => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(
      `${BASE_URL}/reports/export/${dataset}/?export=${format}`,
      { headers: { Authorization: `Token ${authToken}` } }
    );
    if (!response.ok) throw new Error(`Export failed: ${response.status}`);
    return response.blob();
  },

  /** Trigger a browser file download from a Blob. */
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export const catalogService = {
  getPackages: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/packages/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : data?.results || [];
  },
  getSyllabi: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/syllabi/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : data?.results || [];
  },
  getClasses: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : data?.results || [];
  },
  // Fetch dynamic activity types from DropdownOption (group=activity_type)
  getActivityTypes: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/dropdowns/?group=activity_type`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    const list = Array.isArray(data) ? data : data?.results || [];
    // Normalize: [{label, value}]
    return list.map((item) => ({
      label: item.label || item.name || item.value,
      value: item.value || item.label,
    }));
  },
};

export const clientService = {
  getClients: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.pageSize) searchParams.append("page_size", params.pageSize);
    if (params.search) searchParams.append("search", params.search);
    if (params.district) searchParams.append("district", params.district);
    if (params.municipality) searchParams.append("municipality", params.municipality);
    if (params.active !== undefined && params.active !== null) searchParams.append("active", params.active);

    const qs = searchParams.toString();
    const url = `${BASE_URL}/clients/${qs ? `?${qs}` : ""}`;
    const response = await apiFetch(url, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  getClient: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/clients/${id}/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  enrollLead: async (enrollData, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/clients/enroll/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enrollData),
    });
    return handleResponse(response);
  },

  updateClient: async (id, updates, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/clients/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  getContracts: async (leadId, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/contracts/?lead=${leadId}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },
};
