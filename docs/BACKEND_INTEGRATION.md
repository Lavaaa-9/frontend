# Backend integration requirements

The application is disconnected. `BACKEND_INTEGRATION_READY` is intentionally false; there is no configuration switch to enable the old adapter. The Go/Gin API and its contracts have not been supplied or verified for this work. The requirements below are proposals for agreement, not claims that endpoints exist.

The retained adapter was previously prepared against a different Go Fiber backend revision (`8ddee1ddc16d58c5fb01cdb2006749ab057e9ec4`). Its URLs, bearer token model, DTOs and permissions must not be assumed to match the future backend. Review or replace it only after the contract is approved. The present cookie refresh implementation has no agreed CSRF protection and must not be enabled as-is.

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

## Before opening the integration gate

Implement the approved client and typed models, CSRF and server enforcement; replace any incompatible legacy calls and permission names. Provide real loading, empty and error states and validated, duplicate-safe forms for each integrated feature. Exercise sign-in, disabled accounts, expired sessions, 401/403, logout, CSRF rejection, patient registration and every handoff against an authorized staging backend with synthetic data. Verify accessibility, responsiveness and clinical workflows with the clinic. Document results and residual risks; do not claim production readiness or compliance without independent review.
