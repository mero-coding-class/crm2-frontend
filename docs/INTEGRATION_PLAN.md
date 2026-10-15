# CRM2 Frontend — Backend Integration Plan

**Stack**: React 19 + Vite 6 + React Router 7 + Tailwind 4 + Radix UI  
**Backend**: Django REST Framework on `localhost:8000` (session auth + CSRF)  
**Contract**: `crm2-backend/docs/API.md` (frozen — source of truth)

---

## 1. Architecture Overview

### 1.1 Auth Flow (Session-Based, No Tokens)

```
Login page → POST /api/auth/login/ {username, password}
  → 200 {id, username, email, first_name, last_name, role, is_active}
  → Backend sets HttpOnly session cookie + csrftoken cookie
  → Frontend stores NOTHING (profile JSON only, in React state)

Every subsequent request:
  fetch(url, { credentials: "include", headers: { "X-CSRFToken": csrf } })
  → Cookie travels automatically (HttpOnly, same-origin via Vite proxy)

Logout → POST /api/auth/logout/ → session destroyed
```

**Forbidden**: `localStorage` for auth, `Authorization` header, bearer <_REDACTED>, `token` in any form.

### 1.2 CSRF Pattern

```js
// Read csrftoken from cookie (not HttpOnly — JS can read it)
const getCsrf = () =>
  document.cookie.split("; ").find(c => c.startsWith("csrftoken="))?.split("=")[1];

// Every POST/PATCH/DELETE must include:
headers: { "X-CSRFToken": getCsrf(), "Content-Type": "application/json" }
```

Missing header → 403 `{detail: "CSRF token missing or incorrect."}` — looks like a permission bug but isn't.

### 1.3 Idempotency Pattern

```js
// On every CREATE (POST that creates a row):
headers: { ..., "Idempotency-Key": crypto.randomUUID() }

// Retry of same submit (e.g. network timeout, user double-click):
// Reuse the SAME key → backend returns original 201, no duplicate row
```

Applies to: leads, activities, enroll (per API.md §0).

### 1.4 Error Taxonomy

| Status | Meaning | Frontend behavior |
|---|---|---|
| 403 (no CSRF) | CSRF missing/incorrect | Retry with CSRF header (should never happen — apiFetch handles it) |
| 403 (session) | Unauthenticated (session expired) | Redirect to /login |
| 403 (permission) | In-scope but forbidden action | Show "You don't have permission" toast |
| 404 | Out-of-scope / hidden / nonexistent | **Silently omit** from cross-role views (don't show as error) |
| 400 | Validation error | Show `{field: [message]}` errors inline |
| 405 | Method not allowed (no-delete routes) | N/A — never call DELETE |
| 429 | Rate limited (login: 10/min) | Show "Too many attempts, wait" |

### 1.5 Vite Proxy (Already Configured)

```js
// vite.config.js — keep as-is
proxy: {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
}
```

Frontend runs on `:3000`, backend on `:8000`. All fetches use `/api/...` (relative).

---

## 2. New `src/services/api.js` Design

### 2.1 Core Fetch Wrapper

```js
// ONE function that enforces all golden rules
async function apiFetch(path, { method = "GET", body, idempotency = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  
  if (method !== "GET") {
    headers["X-CSRFToken"] = getCsrf();
    if (idempotency) headers["Idempotency-Key"] = crypto.randomUUID();
  }
  
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (res.status === 403 && !getCsrf()) throw new AuthError(); // → redirect login
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### 2.2 Service Modules (No authToken param)

```js
// Every service function is a thin wrapper around apiFetch
export const authService = {
  login: (username, password) => apiFetch("/auth/login/", { method: "POST", body: { username, password } }),
  logout: () => apiFetch("/auth/logout/", { method: "POST" }),
  me: () => apiFetch("/auth/me/"),
  updateProfile: (data) => apiFetch("/auth/me/", { method: "PATCH", body: data }),
  changePassword: (data) => apiFetch("/auth/password/", { method: "POST", body: data }),
};

export const leadService = {
  list: (params) => apiFetch(`/leads/?${qs(params)}`),
  get: (id) => apiFetch(`/leads/${id}/`),
  create: (data) => apiFetch("/leads/", { method: "POST", body: data, idempotency: true }),
  update: (id, data) => apiFetch(`/leads/${id}/`, { method: "PATCH", body: data }),
  archive: (id, data) => apiFetch(`/leads/${id}/archive/`, { method: "POST", body: data }),
  restore: (id) => apiFetch(`/leads/${id}/restore/`, { method: "POST" }),
  approve: (id, reason) => apiFetch(`/leads/${id}/approve/`, { method: "POST", body: { reason } }),
  reject: (id, reason) => apiFetch(`/leads/${id}/reject/`, { method: "POST", body: { reason } }),
  assign: (id, data) => apiFetch(`/leads/${id}/assign/`, { method: "POST", body: data }),
  // ... etc
};
```

### 2.3 What Gets Deleted

- All `authToken` parameters from every service function
- All `Authorization: Token ...` headers
- `handleResponse` in favor of centralized error classes
- `formatDateForApi` (backend uses ISO-8601, not YYYY-MM-DD)
- `sanitizeShift` (not in contract)
- `resolveServerId` (legacy ID mapping — not needed)
- All `crm:leadUpdated` / `crm:remarkUpdated` custom events (use React Query or context refresh instead)

---

## 3. New `src/context/AuthContext.jsx` Design

```jsx
// State: { user: {id, username, email, first_name, last_name, role, is_active} | null, loading: bool }

const login = async (username, password) => {
  const profile = await authService.login(username, password);
  setUser(profile);
  return profile;
};

const logout = async () => {
  await authService.logout();
  setUser(null);
};

const refreshProfile = async () => {
  const profile = await authService.me();
  setUser(profile);
};

// On mount: try refreshProfile() → if 403, setUser(null) + redirect /login
// NO localStorage for auth data
```

**Role helpers**:
```js
const hasRole = (...roles) => roles.includes(user?.role);
const isAdmin = user?.role === "admin";
const isB2B = user?.role === "b2b";
const isB2C = user?.role === "b2c";
const isAcademic = user?.role === "academic";
```

---

## 4. Role-Based Routing (§11 Matrix)

### 4.1 Route Guards

```jsx
// Wrapper component
const RequireRole = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};
```

### 4.2 Nav Items by Role

| Nav item | Admin | B2B | B2C | Academic |
|---|---|---|---|---|
| Dashboard | [x] | [x] | [x] | [x] |
| Leads | [x] | [x] | [x] (read-only) | — |
| Clients | [x] | [x] (own) | — | [x] (assigned) |
| Demos | [x] | [x] (own) | — | [x] (all scheduled) |
| Reports | [x] | [x] (own) | — | — |
| Calendar | [x] | [x] | — | [x] |
| Admin (users/approvals) | [x] | — | — | — |
| Settings | [x] | [x] | [x] | [x] |

### 4.3 Lead Scoping (UI hints)

- **Admin**: sees all, sees pending badge, sees unassigned pile
- **B2B**: sees own + own pending; can create (→pending); can edit own (no rename/source)
- **B2C**: sees call-assigned approved only; read-only (no edit buttons); can log activities
- **Academic**: no lead access at all (403 — hide nav, redirect if they hit URL)

---

## 5. Page-by-Page Integration

### 5.1 Login (`/login`)
- Username + password form
- On submit: `authService.login()` → on 200, `setUser(profile)` → redirect `/dashboard`
- On 400: show "Invalid credentials"
- On 429: show "Too many attempts — wait a minute"
- **No "remember me"**, no token storage

### 5.2 Dashboard (`/dashboard`)
- Fetch `GET /dashboard/`
- Render widgets per role:
  - Everyone: today[], tomorrow[], next_7_days[], overdue[], unread_notifications, demo_queue[]
  - Admin adds: pending_approvals, escalations[], renewals[]
  - Non-admin: escalations = own
  - Academic: task lists empty, demo queue visible
  - B2C: sees own escalations only

### 5.3 Leads (`/leads`)
- **List**: `GET /leads/` with filters (municipality, district, owner, call_assignee, demo, sub_status, search, ordering)
- **Create**: `POST /leads/` with `Idempotency-Key`
  - Admin → approved (can set owner)
  - B2B → pending (owner forced self, call_assignee stripped)
  - B2C/Academic → 403 (hide button)
- **Edit**: `PATCH /leads/:id/`
  - Admin: all writable
  - B2B: own assigned-or-pending, no school_name/source
  - B2C: read-only (no edit button)
- **Archive**: `POST /leads/:id/archive/` with `{reason, next_year_probability}` (mandatory)
- **Restore**: `POST /leads/:id/restore/` (admin only)
- **Assign**: `POST /leads/:id/assign/` (admin only for owner; B2B for call_assignee on own leads)
- **Approval queue** (admin): `GET /approvals/`, `POST /approvals/batch/`
- **Import** (admin/B2B): `POST /leads/import/preview/`, `POST /leads/import/confirm/`
- **Bulk edit** (admin/B2B): `POST /leads/bulk-edit/`
- **Bulk archive** (admin/B2B): `POST /leads/bulk-archive/`

### 5.4 Activities & Tasks
- **Log activity**: `POST /activities/` (spawns task, flips demo_scheduled/proposal_status)
  - Admin: any in-scope lead
  - B2B: owner=self
  - B2C: call_assignee=self
  - Academic: 403 (hide)
- **Timeline**: `GET /activities/?lead=:id` (newest first)
- **Edit activity**: `PATCH /activities/:id/` (own entries only for B2B/B2C)
- **Tasks list**: `GET /tasks/` (admin all + filters; others owner=self)
- **Update task**: `PATCH /tasks/:id/` (owner or admin)

### 5.5 Demos (`/demo`)
- **List**: `GET /demos/` (role-scoped)
  - Admin: all + `?unassigned=true` pile
  - B2B: own leads
  - Academic: all scheduled + own assignments
  - B2C: empty (hide nav)
- **Create**: `POST /demos/` (admin any active lead; B2B own leads, no academic)
- **Assign**: `POST /demos/:id/assign/` (admin only)
- **Feedback**: `POST /demos/:id/feedback/` (assignee or admin) → marks completed, notifies owner
- **Reschedule**: `PATCH /demos/:id/` (B2B: demo_at/details/program/outcome only)

### 5.6 Clients & Enroll (`/clients`)
- **List**: `GET /clients/` (admin all; B2B own; academic assigned; B2C none → 404, hide)
- **Enroll**: `POST /clients/enroll/` (admin or B2B-owner)
  - Client fields + separate contract dates (`signed_date`, `start_date`, `end_date`)
  - `included_classes[]`, optional `assigned_to`, `first_class_date`
- **Contracts**: `GET /contracts/?lead=` (role-scoped)
- **Renew**: `POST /contracts/:id/renew/` (admin only, three-way decision)

### 5.7 Reports (`/reports`)
- **Summary**: `GET /reports/summary/` (admin all / B2B own / B2C+academic 403 → hide)
- **Lead rows**: `GET /reports/leads/` (JSON or `?export=csv|xlsx`)
- **Full export**: `GET /reports/export/<dataset>/?export=csv|xlsx`

### 5.8 Calendar (`/calendar` or embedded in dashboard)
- `GET /calendar/?from=YYYY-MM-DD&to=` (default current month)
- Scoped per role (B2B own, academic assigned + all scheduled, B2C none)

### 5.9 Settings (`/settings`)
- Profile edit: `PATCH /auth/me/` (email, first_name, last_name)
- Password change: `POST /auth/password/`
- Catalog reads: `/catalogs/classes|packages|syllabi/`
- Dropdowns: `/catalogs/dropdowns/?group=...`
- Admin: catalog writes + deactivation

### 5.10 Admin — Users (under `/admin` or `/settings`)
- `GET /users/` — admin only
- `POST /users/` — create user
- `PATCH /users/:id/` — edit, deactivate with `reassign_to`
- `GET /approvals/` — pending queue
- `POST /approvals/batch/` — batch approve/reject

---

## 6. Execution Checklist (Happy-Path Script)

### Phase 0 — Handshake
1. Start backend on `:8000`
2. Start frontend on `:3000`
3. Login as admin → expect 200 + profile JSON, **no token field**
4. `GET /auth/me/` → still 200 (session persists)
5. `PATCH /auth/me/` with CSRF → 200 (CSRF round-trip proven)
6. `POST /auth/logout/` → session dead
7. `GET /auth/me/` → 403 (redirect to login)

### Phase 1 — Admin Flows
8. Login as admin
9. Create one user per role (b2b, b2c, academic) via `POST /users/`
10. `GET /users/` → verify all 4 users listed
11. Deactivate a user with live work → `PATCH /users/:id/` with `reassign_to`
12. Create a lead (admin → approved)
13. Create a lead as B2B (→ pending)
14. Admin approves pending lead → `POST /leads/:id/approve/`
15. Admin rejects a lead → `POST /leads/:id/reject/`
16. Batch approve/reject → `POST /approvals/batch/`
17. Assign/reassign lead → `POST /leads/:id/assign/`
18. Enroll with separate contract dates → `POST /clients/enroll/`
19. Archive lead → `POST /leads/:id/archive/`
20. Restore lead → `POST /leads/:id/restore/`
21. Renew three-way → `POST /contracts/:id/renew/`

### Phase 2 — Per-Role Pass (4 logins)
22. **B2B**: create lead (→pending) → admin approves → B2B logs activity (task spawns) → complete task → enroll → client appears
23. **B2C**: login → assigned-lead reads → log activity → verify clients/reports return 403 and are hidden
24. **Academic**: login → all-scheduled demos → submit feedback → owner notified
25. **Boundary verification**: every 403/404 in §11 matrix demonstrated

### Phase 3 — Persistence & Downloads
26. Every created/edited row re-fetched after browser refresh
27. Double-submit with one Idempotency-Key → one row
28. CSV export: `GET /reports/export/leads/?export=csv` → file downloads
29. Dashboard widgets per role verified
30. Calendar month view per role verified

---

## 7. Failure Packet Log

| # | Endpoint | Method | Role | Request Body | Status | Response Body | Diagnosis |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | *(empty — all green)* |

## 6a. Handshake Test Results — PASSED (2026-10-14)

| Step | Test | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | `POST /api/auth/login/` | 200 + profile, no token field | 200, username=admin, role=admin, no token/key | PASS |
| 2 | `GET /api/auth/me/` (after login) | 200 + profile | 200, username=admin, role=admin | PASS |
| 3 | `PATCH /api/auth/me/` with X-CSRFToken | 200 | 200, first_name updated | PASS |
| 4 | `POST /api/auth/logout/` | 200 | 200 | PASS |
| 5 | `GET /api/auth/me/` (after logout) | 403 | 403 | PASS |

**CSRF round-token**: `csrftoken` cookie → `X-CSRFToken` header → 200. Confirmed working.

---

## 8. Files to Rewrite

| File | Action | Scope |
|---|---|---|
| `src/services/api.js` | **Full rewrite** | All 1113 lines → ~400 lines, CSRF + idempotency + session auth |
| `src/context/AuthContext.jsx` | **Full rewrite** | Remove token storage, add session-based auth |
| `src/pages/Login.jsx` | **Full rewrite** | Username/password only, no token handling |
| `src/App.jsx` | **Modify** | Add `RequireRole` guards, role-based nav |
| `src/layouts/MainLayout.jsx` | **Modify** | Role-based nav items |
| `src/pages/Leads.jsx` | **Modify** | Remove authToken, add CSRF, role-scoped actions |
| `src/pages/Clients.jsx` | **Modify** | Remove authToken, add CSRF |
| `src/pages/Demo.jsx` | **Modify** | Remove authToken, add CSRF |
| `src/pages/Reports.jsx` | **Modify** | Remove authToken, add CSRF, fix export params |
| `src/pages/Dashboard.jsx` | **Modify** | Remove authToken, role-based widgets |
| `src/pages/Settings.jsx` | **Modify** | Remove authToken, add CSRF |
| `src/pages/Archive.jsx` | **Modify** | Remove authToken, add CSRF |
| `src/pages/TrashPage.jsx` | **Modify** | Remove authToken, add CSRF |
| `src/pages/Downloads.jsx` | **Modify** | Remove authToken, fix export params |
| `src/components/AddLeadModal.jsx` | **Modify** | Remove authToken prop, add idempotency |
| `src/components/ActivityModal.jsx` | **Modify** | Remove authToken prop, add idempotency |
| `src/components/EnrollModal.jsx` | **Modify** | Remove authToken prop, add idempotency |
| `src/components/LeadEditModal.jsx` | **Modify** | Remove authToken prop, add CSRF |
| `src/components/ImportCsvButton.jsx` | **Modify** | Fix import endpoints (preview/confirm, not batch) |
| `src/components/ClientsTable.jsx` | **Modify** | Remove authToken prop |
| `src/components/ReportDocument.jsx` | **Modify** | Remove authToken prop, fix export |
| `src/config.js` | **Keep** | `BASE_URL = "/api"` (correct) |
| `vite.config.js` | **Keep** | Proxy already correct |

---

## 9. Files to Create

| File | Purpose |
|---|---|
| `src/lib/errors.js` | `AuthError`, `ApiError` classes |
| `src/lib/csrf.js` | `getCsrfToken()` helper |
| `src/components/RequireRole.jsx` | Route guard wrapper |
| `src/components/RoleNav.jsx` | Role-based nav items |

---

## 10. Out of Scope

- Backend code changes
- Migrations
- Production deploy
- PDF exports (backend has CSV/XLSX only)
- Help/CSV guideline docs (PM-owned)
- Any field or role not in `docs/API.md`
