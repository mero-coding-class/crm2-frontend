
/**
 * BASE_URL — single source of truth for backend API root.
 * - Uses VITE_API_URL when set (e.g. https://api.example.com/api).
 * - Falls back to VITE_BACKEND_URL + "/api" when only backend origin is set.
 * - Defaults to relative "/api" so Vite dev proxy (vite.config.js) handles
 *   CORS and no hardcoded localhost leaks into production builds.
 */
const fromEnv = (typeof import.meta !== "undefined" && import.meta.env) || {};

const explicitApi =
  fromEnv.VITE_API_URL || fromEnv.VITE_API_BASE_URL || "";

const backendOrigin = fromEnv.VITE_BACKEND_URL || "";

export const BASE_URL =
  (explicitApi && explicitApi.replace(/\/+$/, "")) ||
  (backendOrigin ? `${backendOrigin.replace(/\/+$/, "")}/api` : "/api");

export const getApiUrl = (path = "") => {
  const suffix = String(path || "");
  if (!suffix) return BASE_URL;
  return `${BASE_URL}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
};
