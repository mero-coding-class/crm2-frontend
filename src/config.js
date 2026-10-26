const trimTrailingSlashes = (value = "") => value.replace(/\/+$/, "");

export const API_ORIGIN = trimTrailingSlashes(import.meta.env.VITE_API_ORIGIN);
export const WEBSOCKET_ORIGIN = trimTrailingSlashes(
  import.meta.env.VITE_WEBSOCKET_ORIGIN || API_ORIGIN
);
export const BASE_URL = `${API_ORIGIN}/api`;
