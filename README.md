# Spartial Healthcare Workspace

React, TypeScript and Vite frontend for Spartial Specialized Polyclinic. This is **not a production-ready clinical system**. Authentication and patient integration are unverified against a running backend. Use only synthetic data in an isolated development environment.

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

`src/App.tsx` mounts the staff workspace instead of the former synthetic demo. In development, copying `.env.example` to `.env.local` and explicitly setting `VITE_ENABLE_BACKEND=true` enables the adapter for an isolated test server. Production builds remain gated. The example backend URL is `http://localhost:8080/api/v1`; the frontend uses `http://localhost:3000` to match the supplied backend's default Origin allowlist and Strict cookie policy. Configure both sides consistently, and do not use real patient data. Original demo feature files remain for reference and legacy tests but are not mounted by the entry point.

The supplied backend uses Fiber and applies an exact Origin check to browser authentication; protected API requests use bearer access tokens and refresh uses an HttpOnly Strict cookie. This mechanism and the deployed cookie/proxy configuration need end-to-end security verification. The frontend's adapter and module permissions must be tested against the current backend; frontend checks alone do not secure records. See [the integration audit](docs/INTEGRATION_AUDIT.md) and [the remaining requirements](docs/BACKEND_INTEGRATION.md).

`VITE_API_BASE_URL` is public configuration only. Do not put credentials, private keys or other secrets in frontend environment variables. Production hosting requires HTTPS and an approved deployment configuration. No deployment or backend changes were made.

See [the audit and status](FRONTEND_TODO.md) for the identified demo code, completed preparation and remaining work. Existing screenshots and the UI blueprint are historical demo artifacts, not representations of the current application.
