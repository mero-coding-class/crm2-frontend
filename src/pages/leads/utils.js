// Utility helpers used across Leads page modules
export const normalize = (v) => (v === undefined || v === null ? "" : String(v).trim());

export const deduplicateLeads = (leads) => {
  if (!Array.isArray(leads)) return [];
  const seen = new Set();
  const result = [];
  for (const lead of leads) {
    if (!lead) continue;
    const key = normalize(lead.id ?? lead._id ?? lead.system_id);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    result.push(lead);
  }
  return result;
};

export const matchId = (lead, idToMatch) => {
  const n = (v) => (v === undefined || v === null ? "" : String(v));
  return n(lead.id ?? lead._id) === n(idToMatch);
};
