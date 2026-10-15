// Centralized error classes for API responses.
// Per API.md: session API returns 403 (never 401) for unauthenticated requests.

export class AuthError extends Error {
  constructor() {
    super("Session expired — please log in again.");
    this.name = "AuthError";
    this.status = 403;
    this.isAuthError = true;
  }
}

export class ApiError extends Error {
  constructor(status, body) {
    // DRF validation errors: {field: [message, ...]}
    // DRF permission errors: {detail: "..."}
    if (body && typeof body === "object") {
      const firstKey = Object.keys(body)[0];
      if (Array.isArray(body[firstKey])) {
        super(body[firstKey][0] || "Validation failed");
      } else if (typeof body.detail === "string") {
        super(body.detail);
      } else {
        super(JSON.stringify(body));
      }
    } else {
      super(`HTTP ${status}`);
    }
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.isApiError = true;
  }
}
