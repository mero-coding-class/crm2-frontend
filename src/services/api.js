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
      } catch {
        // Authentication state will also be cleared by the next request.
      }
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
  } catch {
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


export const leadService = {
  getLead: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  getLeads: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const leads = [];
    let page = 1;
    while (true) {
      const response = await leadService.getLeadsPage(authToken, page, 100);
      leads.push(...response.results);
      if (page >= response.totalPages || response.results.length === 0) break;
      page += 1;
    }
    return leads;
  },

  // Fetch a specific page of leads from the backend (supports paginated API)
  getLeadsPage: async (authToken, page = 1, pageSize = 20, filters = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const params = new URLSearchParams({ page, page_size: pageSize });
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, String(value).trim());
      }
    });
    const url = `${BASE_URL}/leads/?${params.toString()}`;
    const resp = await apiFetch(url, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const json = await handleResponse(resp);

    // Normalize response: backend may return { results: [...], count }
    const list = Array.isArray(json) ? json : json?.results || [];
    const count = json && typeof json === "object" ? (json.count ?? json.total ?? null) : null;
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
      contact_person: lead.contact_person || "",
      contact_number: lead.contact_number || "",
      sub_status: lead.sub_status || "New",
      approval: lead.approval || "",
    }));

    return { results: mapped, count: count ?? null, totalPages };
  },

  createLead: async (payload, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  updateLead: async (id, updates = {}, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");

    const WRITABLE_FIELDS = [
      "school_name", "district", "municipality", "address",
      "contact_person", "contact_number", "alt_number", "alt_contact_person",
      "email", "source", "course_interest", "social_media", "sub_status",
    ];
    const unsupportedFields = Object.keys(updates || {}).filter(
      (field) => !WRITABLE_FIELDS.includes(field)
    );
    if (unsupportedFields.length) {
      throw new Error(`Unsupported lead fields: ${unsupportedFields.join(", ")}`);
    }

    const backendUpdates = {};

    WRITABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        backendUpdates[field] = updates[field];
      }
    });

    if (Object.keys(backendUpdates).length === 0) {
      throw new Error("Provide at least one supported lead field to update.");
    }

    const doPatch = async (payload) => {
      const resp = await apiFetch(`${BASE_URL}/leads/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Token ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return handleResponse(resp);
    };

    const data = await doPatch(backendUpdates);
    const serverData = data && typeof data === "object" ? data : {};
    const merged = { ...backendUpdates, ...serverData };
    merged.id = serverData.id ?? id;
    merged._id = serverData._id ?? String(merged.id);
    merged.sub_status = merged.sub_status || backendUpdates.sub_status || "New";
    merged.substatus = merged.sub_status;

    return merged;
  },

  /** Archive a single lead (soft-delete). */
  archiveLead: async (id, authToken, reason = "", nextYearProbability = false) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${id}/archive/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason, next_year_probability: nextYearProbability }),
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

  /** Archive multiple leads in one round-trip. */
  bulkArchiveLeads: async (ids, authToken, reason = "", nextYearProbability = false) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/bulk-archive/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids, reason, next_year_probability: nextYearProbability }),
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
    const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value).trim());
      }
    });
    const response = await apiFetch(`${BASE_URL}/archived-leads/?${query}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const json = await handleResponse(response);
    const list = Array.isArray(json) ? json : json?.results || [];
    const count = Array.isArray(json) ? list.length : (json?.count ?? list.length);
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    return {
      results: list.map((lead) => ({
        id: lead.id,
        _id: String(lead.id),
        system_id: lead.system_id || "",
        school_name: lead.school_name || "",
        district: lead.district || "",
        municipality: lead.municipality || "",
        contact_person: lead.contact_person || "",
        contact_number: lead.contact_number || "",
        status: lead.status || "not_interested",
        archive_reason: lead.archive_reason || "",
        next_year_probability: lead.next_year_probability ?? null,
        created_at: lead.created_at || "",
        updated_at: lead.updated_at || "",
      })),
      count,
      totalPages,
    };
  },
};

// Resolve a backend id without inventing one from client-side lead fields.
export const resolveServerId = (leadOrId) => {
  if (leadOrId === null || leadOrId === undefined) return null;

  const candidate = typeof leadOrId === "object"
    ? leadOrId.id ?? leadOrId._id
    : leadOrId;
  if (candidate === null || candidate === undefined) return null;
  const id = String(candidate).trim();
  if (!id || id.startsWith("lead-")) return null;
  return /^\d+$/.test(id) ? Number(id) : id;
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
      body: JSON.stringify({ name: courseName }),
    });
    const course = await handleResponse(response);
    return { ...course, course_name: course.name || course.course_name || "" };
  },

  updateCourse: async (id, courseName, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: courseName }),
    });
    const course = await handleResponse(response);
    return { ...course, course_name: course.name || course.course_name || "" };
  },

  deleteCourse: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/catalogs/classes/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${authToken}` },
    });
    if (!response.ok) {
      let errorMsg = "Failed to delete course";
      try {
        const data = await response.json();
        errorMsg = data.detail || JSON.stringify(data);
      } catch {
        try {
          errorMsg = await response.text();
        } catch {
          // Keep the default error message when the response body is unavailable.
        }
      }
      throw new Error(errorMsg);
    }
    return {};
  },
};

// ─── Lead import preview and confirmation ────────────────────────────────────
export const importService = {
  preview: async (file, authToken, signal) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const fd = new FormData();
    fd.append("file", file);
    const response = await apiFetch(`${BASE_URL}/leads/import/preview/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}` },
      body: fd,
      signal,
    });
    return handleResponse(response);
  },

  confirm: async (batchKey, selected, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/import/confirm/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch_key: batchKey, selected }),
    });
    return handleResponse(response);
  },
};

// ─── Activity Service ────────────────────────────────────────────────────────
export const activityService = {
  /** List activities for a lead (paginated). */
  getActivities: async (leadId, authToken, page = 1, pageSize = 100) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const qs = new URLSearchParams({ lead: leadId, page, page_size: pageSize }).toString();
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

};

// ─── Demo Service ────────────────────────────────────────────────────────────
export const demoService = {
  /** List demos (role-scoped). Supports params: lead, demo_status, academic, from, to, unassigned */
  getDemos: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const queryParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    queryParams.page_size = 100;

    const fetchPage = async (page) => {
      const pageParams = new URLSearchParams({ ...queryParams, page: String(page) });
      const response = await apiFetch(`${BASE_URL}/demos/?${pageParams}`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      return handleResponse(response);
    };

    const firstPage = await fetchPage(1);
    if (Array.isArray(firstPage)) {
      return { results: firstPage, count: firstPage.length };
    }

    const list = [...(firstPage?.results || [])];
    const count = firstPage?.count || list.length;
    const pageCount = Math.ceil(count / 100);
    for (let page = 2; page <= pageCount; page += 1) {
      const data = await fetchPage(page);
      const rows = Array.isArray(data) ? data : data?.results || [];
      if (rows.length === 0) break;
      list.push(...rows);
    }
    return { results: list, count };
  },

  /** Load the minimal lead and academic choices used by full demo editors. */
  getEditOptions: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/edit-options/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
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

  /** Delete a demo the current user is allowed to manage. */
  deleteDemo: async (id, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/demos/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${authToken}` },
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
  /** Dashboard queues and database-aggregated, role-scoped metrics. */
  getDashboard: async (authToken, params = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value))
    ).toString();
    const response = await apiFetch(`${BASE_URL}/dashboard/${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

};

export const approvalService = {
  getPendingCount: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/approvals/count/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },
  getQueue: async (authToken, page = 1, pageSize = 25) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/approvals/?page=${page}&page_size=${pageSize}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return {
      results: Array.isArray(data) ? data : data?.results || [],
      count: Array.isArray(data) ? data.length : data?.count || 0,
    };
  },
  decide: async (leadId, decision, reason, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/leads/${leadId}/${decision}/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reason ? { reason } : {}),
    });
    return handleResponse(response);
  },
  approveLead: (id, reason, authToken) => approvalService.decide(id, "approve", reason, authToken),
  rejectLead: (id, reason, authToken) => approvalService.decide(id, "reject", reason, authToken),
  batchReview: async (ids, action, authToken, reason = "") => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/approvals/batch/`, {
      method: "POST",
      headers: { Authorization: `Token ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, ...(reason ? { reason } : {}) }),
    });
    return handleResponse(response);
  },
};

export const profileService = {
  getMyProfile: async (authToken) => {
    const response = await apiFetch(`${BASE_URL}/auth/me/`, {
      headers: authToken ? { Authorization: `Token ${authToken}` } : {},
    });
    return handleResponse(response);
  },
  updateMyProfile: async (updates, authToken) => {
    const response = await apiFetch(`${BASE_URL}/auth/me/`, {
      method: "PATCH",
      headers: {
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },
  changePassword: async (oldPassword, newPassword, authToken) => {
    const response = await apiFetch(`${BASE_URL}/auth/password/`, {
      method: "POST",
      headers: {
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    return handleResponse(response);
  },
};

export const notificationService = {
  getNotifications: async (authToken, { unread = false, pageSize = 8 } = {}) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const params = new URLSearchParams({ page: "1", page_size: String(pageSize) });
    if (unread) params.set("unread", "true");
    const response = await apiFetch(`${BASE_URL}/notifications/?${params}`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    const data = await handleResponse(response);
    return {
      results: Array.isArray(data) ? data : data?.results || [],
      count: Array.isArray(data) ? data.length : data?.count || 0,
    };
  },
  markRead: async (id, authToken) => {
    const response = await apiFetch(`${BASE_URL}/notifications/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_read: true }),
    });
    return handleResponse(response);
  },
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
    const validValues = new Map([
      ["phone", "phone"],
      ["field visit", "field visit"],
      ["whatsapp", "WhatsApp"],
      ["email", "email"],
      ["meeting", "meeting"],
      ["demo", "demo"],
    ]);
    return list
      .map((item) => {
        const label = item.label || item.name || item.value || "";
        const value = item.value || validValues.get(String(label).toLowerCase());
        return value ? { label, value } : null;
      })
      .filter(Boolean);
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
    if (params.renewals) searchParams.append("renewals", params.renewals);
    if (params.enrolled_from) searchParams.append("enrolled_from", params.enrolled_from);
    if (params.enrolled_to) searchParams.append("enrolled_to", params.enrolled_to);
    if (params.converted_from) searchParams.append("converted_from", params.converted_from);
    if (params.converted_to) searchParams.append("converted_to", params.converted_to);
    if (params.contract_from) searchParams.append("contract_from", params.contract_from);
    if (params.contract_to) searchParams.append("contract_to", params.contract_to);

    const qs = searchParams.toString();
    const url = `${BASE_URL}/clients/${qs ? `?${qs}` : ""}`;
    const response = await apiFetch(url, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  getAcademicAssignees: async (authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/clients/academic-assignees/`, {
      headers: { Authorization: `Token ${authToken}` },
    });
    return handleResponse(response);
  },

  assignAcademic: async (clientId, assignedTo, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const response = await apiFetch(`${BASE_URL}/clients/${clientId}/assign-academic/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assigned_to: assignedTo }),
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

  /** Return a client to Leads through the existing contract transition. */
  returnToLeads: async (leadId, authToken) => {
    if (!authToken) throw new Error("Authentication token not found.");
    const contractData = await clientService.getContracts(leadId, authToken);
    const contracts = Array.isArray(contractData)
      ? contractData
      : contractData?.results || [];
    const contract = contracts.find((item) => item?.state === "active") || contracts[0];
    if (!contract?.id) throw new Error("No contract was found for this client.");

    const response = await apiFetch(`${BASE_URL}/contracts/${contract.id}/renew/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decision: "accept" }),
    });
    return handleResponse(response);
  },
};
