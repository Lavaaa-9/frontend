# Backend boundary — integration deferred

The latest master prompt requests a coherent synthetic frontend before connecting a backend. Default mode is `VITE_DATA_MODE=demo`; it mounts the in-memory repository and does not restore sessions, fetch patients or send sign-in requests. Do not connect real patient data during development or QA.

The owner previously supplied `https://github.com/Lavaaa-9/backend.git`. API preparation was inspected against commit `8ddee1ddc16d58c5fb01cdb2006749ab057e9ec4`, including `api/openapi/openapi.json` and route/service source. That revision uses Go Fiber and PostgreSQL; the master prompt names future Go/Gin. Confirm the intended staging revision and approved OpenAPI contract before enabling the adapter. The reference checkout is no longer needed in this frontend package. No backend was created or modified here.

## Retained adapter

For a separately approved staging integration, `VITE_DATA_MODE=api` selects the API workspace. `VITE_API_BASE_URL` defaults to `/api/v1`. Prefer same-origin HTTPS with a server-side proxy; never place passwords, signing keys or database credentials in frontend environment variables. Absolute cross-origin URLs also require compatible server CORS and cookie policy. There is no development proxy configured or active backend in this task.

The adapter implements the inspected HTTP shapes, not a new proposed backend:

| Area | Existing adapter requests |
| --- | --- |
| Identity | `/auth/login`, `/auth/mfa/verify`, `/auth/refresh`, `/auth/me`, `/auth/logout` |
| Account | `/auth/password`, `/auth/sessions`, session revocation, MFA enrolment/confirmation |
| Facilities | GET/POST `/staff/facilities` |
| Staff | GET/POST `/staff/users`, PUT `/staff/users/{id}` |
| Registration | GET/POST `/staff/patients`, GET/PUT `/staff/patients/{id}` |
| Audit | GET `/staff/audit` |

Access tokens remain in memory. Browser refresh uses the backend's HttpOnly cookie with `credentials: include`. Refresh is serialized and an ambiguous network failure is not automatically retried. A boolean tab-lock marker contains no credentials. Protected page visibility comes from `/auth/me` permissions; server-side authorisation is still required for every record and mutation. The adapter hides records on an idle lock; it cannot guarantee remote revocation when offline.

Patient creation uses an idempotency key retained for retries of an unchanged payload while the form/repository instance remains alive. A page reload discards it; after an ambiguous outcome, search the server before registering again. Updates send the server's version. Conflicts retain form entries and ask the reviewer to reopen the current record. Birth precision supports exact date, year only or unknown without inventing a date.

The inspected backend has no approved department, patient document, next-of-kin, medical-history, appointment, queue, clinical, pharmacy, billing, reporting or video contract matching these demo screens. Demo data models deliberately differ from API DTOs. Do not submit their extra fields to strict JSON endpoints. Do not invent routes or silently fall back from API errors to demo records.

Administrator grants require the backend's independent approval flow; the ordinary staff form cannot grant them. Password recovery mail, broader MFA lifecycle and clinical care-scope workflows need additional approved integration work. Demo duplicate-name checks and the API form's limited name search are not comprehensive identity resolution or record merging.

## Before any staging acceptance

Confirm API revision, deployment origin, TLS/cookie/proxy settings and test accounts through the authorised project lead. Exercise inactive accounts, MFA challenges, session rotation/logout/password change, staff version conflicts, facility scope, patient idempotency/conflicts and denied record access against a running backend using synthetic fixtures. Validate audit persistence in that backend. Unit mocks do not prove authentication, patient-record security or durable auditing.

No live backend integration, database migration, real document upload, production deployment or clinical acceptance was performed.
