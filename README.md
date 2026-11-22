# Mero Coding CRM frontend

React and Vite client for the CRM. The API uses session cookies; Vite proxies
`/api`, `/health`, `/media`, and `/ws` to the backend during development.

## Local development

```bash
npm install
VITE_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Open `http://localhost:3000`. Start the backend and its PostgreSQL and Redis
services first. The backend serves authenticated live change events over
`/ws/updates/`; open pages refresh their own data after a saved change.

For a production frontend hosted separately from the backend, set
`VITE_API_ORIGIN` to the backend origin at build time. Set
`VITE_WEBSOCKET_ORIGIN` when the WebSocket host differs from the API host; it
otherwise uses the API origin. A same-origin reverse proxy may leave both
origins unset, but must explicitly set `VITE_SAME_ORIGIN_API=true` at build
time. Configure the backend CORS/CSRF/WebSocket origin allowlists, and set the
session and CSRF cookie domains to the shared parent domain.

## Available commands

- `npm run dev` starts the Vite development server.
- `npm run build` creates the production bundle in `dist/`.
- `npm run lint` runs ESLint.
- `npm run preview` serves the production bundle locally.
