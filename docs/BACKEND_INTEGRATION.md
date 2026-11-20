# Backend integration requirements

The supplied backend is Fiber v3, with actual route handlers and OpenAPI. The [integration audit](INTEGRATION_AUDIT.md) maps its endpoint families to frontend modules. No live integration has been verified. Production builds keep the integration gate closed; a local development build may explicitly opt in with `VITE_ENABLE_BACKEND=true` against an isolated backend.

The retained adapter was previously prepared against an earlier Fiber revision. The supplied backend uses an in-memory bearer access token, a rotating HttpOnly Strict refresh cookie, exact Origin checks for browser login, MFA verification, refresh and logout, and bearer authorization on protected routes. These controls require verification with the actual browser deployment, including CSRF, CORS, same-site cookies, proxy and HTTPS settings. Do not assume all old DTOs and permissions match the newer server.

## Shared requirements

- Agree an OpenAPI contract, error codes, pagination, versioning, time zones, validation rules and retry semantics. Assign stable server-generated patient and visit identifiers and carry them through every handoff. Avoid client-generated medical record numbers.
- Serve the frontend and APIs over HTTPS. Agree same-origin or explicitly configured cross-origin CORS and cookie policies. No secrets or database credentials belong in the frontend.
- Backend authorization must check identity, role, permission, facility and care scope on every request, including file downloads. Specify consistent 401/403 responses and audit sensitive access and changes server-side.
- Specify secure session cookies (`HttpOnly`, `Secure`, appropriate `SameSite`, limited scope and expiry), session renewal and revocation. Agree and implement CSRF protection for every cookie-authenticated state-changing request, including login, refresh and logout where applicable; verify the design against the actual browser deployment topology. Do not rely on CORS or the frontend gate as authorization.
- Define idempotency and concurrency behavior for registration and all high-impact mutations. Handle ambiguous network failures without claiming success or silently repeating a clinical transaction.
- Keep patient records out of browser storage, logs and screenshots. Use authorized APIs for medical documents. Specify retention and cache controls with the backend and hosting teams.

## Required capabilities

| Area | Backend contract to agree |
| --- | --- |
| Authentication and account | Username/email sign-in, disabled and invalid account responses, session restore/expiry/revocation, logout, CSRF, password recovery, profile, password and MFA lifecycle, permissions and facility scope. |
| Dashboard and reports | Permission-scoped metrics and summaries, definitions, date filters and export access. |
| Patients and reception | Patient search, registration and updates, duplicate review, demographics, encounter creation for walk-ins and appointments, identifier and version rules. |
| Appointments and queue | Scheduling, rescheduling, cancellation, check-in, visit state transitions, conflict and concurrency rules, patient and visit IDs. |
| Nursing and consultations | Authorized triage, observations, clinical notes, drafts, completion, follow-up, validation, handoff and audit rules. |
| Laboratory and pharmacy | Orders linked to visits, status, result verification, dispensing, stock and access rules. |
| Billing | Authorized invoices, line items, currency, payments, reversals, receipt and transaction idempotency. |
| Telemedicine | Scheduling, consent, secure session provisioning, participant authorization and connection lifecycle. |
| Administration | Staff, facilities, roles, permission assignments, approval workflow and audit access. |
| Documents | Authorized upload/download, type and size limits, malware scanning, retention and audit policy. |

## Before production integration

Implement the approved client and typed models, CSRF and server enforcement; replace any incompatible legacy calls and permission names. Provide real loading, empty and error states and validated, duplicate-safe forms for each integrated feature. Exercise sign-in, disabled accounts, expired sessions, 401/403, logout, CSRF rejection, patient registration and every handoff against an authorized staging backend with synthetic data. Verify accessibility, responsiveness and clinical workflows with the clinic. Document results and residual risks; do not claim production readiness or compliance without independent review.
