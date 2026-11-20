# Spartial Healthcare Workspace

React, TypeScript and Vite frontend for Spartial Specialized Polyclinic. This is **not a production-ready clinical system**. The application currently displays a staff sign-in interface with authentication disconnected. It does not create a session or send sign-in requests. No patient information should be entered.

## Run and verify

Use Node.js 22.12 or later:

```powershell
npm ci
npm run dev
npm test
npm run build
```

The build runs TypeScript validation before bundling. The existing automated tests include legacy synthetic workflow tests; those tests do not demonstrate that real clinical workflows work. The old `scripts/browser-check.mjs` and screenshots describe the previous demonstration and are not current acceptance evidence.

## Current boundary

`src/App.tsx` mounts the staff workspace instead of the former synthetic demo. The workspace's integration gate is deliberately closed in `src/app/ApiWorkspace.tsx`; setting an environment variable does not open it. The login form explains that it is unavailable, supports password visibility and provides password assistance. Existing backend adapter code and the original demo feature files remain in the repository for review and tests, but the demo is not reachable from the application entry point.

The retained API adapter was written for an earlier backend revision. It has not been validated against the requested Gin backend and its cookie flows lack an agreed CSRF implementation. Do not enable the gate until the items in [the backend integration requirements](docs/BACKEND_INTEGRATION.md) are complete. The backend must enforce all permissions; frontend checks alone do not secure records.

`VITE_API_BASE_URL` is public configuration only. Do not put credentials, private keys or other secrets in frontend environment variables. Production hosting requires HTTPS and an approved deployment configuration. No deployment or backend changes were made.

See [the audit and status](FRONTEND_TODO.md) for the identified demo code, completed preparation and remaining work. Existing screenshots and the UI blueprint are historical demo artifacts, not representations of the current application.
