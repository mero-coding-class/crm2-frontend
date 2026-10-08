// Utility helpers used across Leads page modules
export const normalize = (v) => (v === undefined || v === null ? "" : String(v).trim());

export const deduplicateLeads = (leads) => {
  if (!Array.isArray(leads)) return [];
  const seen = new Set();
  const result = [];
  for (const lead of leads) {
    if (!lead) continue;
    const key =
      normalize(lead.id) ||
      normalize(lead._id) ||
      normalize(lead.email) ||
      normalize(`${lead.student_name}-${lead.phone_number}`);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(lead);
    }
  }
  return result;
};

export const matchId = (lead, idToMatch) => {
  const n = (v) => (v === undefined || v === null ? "" : String(v));
  return n(lead.id || lead._id) === n(idToMatch);
};

export const ensureLeadIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((lead, i) => ({
    ...lead,
    _id: lead._id || lead.id || lead.email || lead.phone_number || `lead-${i}`,
    sub_status: lead.sub_status || lead.substatus || "New",
    assigned_to: lead.assigned_to || lead.assigned_to_username || "",
    assigned_to_username: lead.assigned_to_username || lead.assigned_to || "",
  }));
