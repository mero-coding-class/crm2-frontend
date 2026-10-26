// Simple localStorage-backed store for exported files (CSV, etc.) per user

const STORAGE_PREFIX = "crm:downloads";

const getUsername = () => (localStorage.getItem("username") || "").trim() || "unknown";

const getKey = () => `${STORAGE_PREFIX}:${getUsername()}`;

function loadAll() {
  try {
    const raw = localStorage.getItem(getKey());
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(items) {
  try {
    localStorage.setItem(getKey(), JSON.stringify(items));
  } catch {
    // If storage quota exceeded, remove oldest entries until it fits (best-effort)
    try {
      let arr = Array.isArray(items) ? items.slice() : [];
      while (arr.length > 1) {
        arr.shift();
        localStorage.setItem(getKey(), JSON.stringify(arr));
        break; // best effort one-shift to avoid long loops
      }
    } catch {
      // Leave the saved export list unchanged if storage is still full.
    }
  }
}

function uuid() {
  // lightweight unique id
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const exportsStore = {
  list() {
    const items = loadAll();
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  save({ fileName, mimeType = "text/csv", content = "", source = "Leads", meta = {} }) {
    const items = loadAll();
    const id = uuid();
    const createdAt = Date.now();
    const size = typeof content === "string" ? content.length : 0;
    const entry = {
      id,
      fileName,
      mimeType,
      content,
      source,
      meta,
      createdAt,
      size,
      exportedBy: getUsername() || "unknown",
    };
    items.push(entry);
    saveAll(items);
    return id;
  },

  remove(id) {
    const items = loadAll().filter((x) => x.id !== id);
    saveAll(items);
  },

  clear() {
    saveAll([]);
  },
};

export default exportsStore;
