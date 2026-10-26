export const RETURNED_TO_LEADS_STORAGE_KEY = "crm:clients:returned-to-leads";

export const getReturnedLeadIds = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(RETURNED_TO_LEADS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set();
  }
};

export const rememberReturnedLeadIds = (leadIds = []) => {
  try {
    const returnedIds = getReturnedLeadIds();
    leadIds.forEach((id) => {
      if (id !== null && id !== undefined) returnedIds.add(String(id));
    });
    localStorage.setItem(RETURNED_TO_LEADS_STORAGE_KEY, JSON.stringify([...returnedIds]));
  } catch (error) {
    console.warn("Could not save clients returned to Leads", error);
  }
};

export const forgetReturnedLeadIds = (leadIds = []) => {
  try {
    const returnedIds = getReturnedLeadIds();
    leadIds.forEach((id) => returnedIds.delete(String(id)));
    if (returnedIds.size) {
      localStorage.setItem(RETURNED_TO_LEADS_STORAGE_KEY, JSON.stringify([...returnedIds]));
    } else {
      localStorage.removeItem(RETURNED_TO_LEADS_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Could not clear returned-client state", error);
  }
};
