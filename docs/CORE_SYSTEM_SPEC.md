# Clinic core implementation brief — 18 November 2026

This is a concrete proposal for the user's new checklist. It is not an implementation or a deployment approval. The current repository remains a frontend prototype. Deletion scope, backend direction and hosting are awaiting the user's answers; no existing records, fixtures, configuration or metadata have been deleted.

## Current evidence and scope

The repository contains React/TypeScript/Vite source, in-memory fixtures and browser/workflow tests. It contains no Go service, database schema, account store, private document storage or durable audit log. Go is installed locally; PostgreSQL and Docker commands were not found on PATH. No connection to an existing backend was found.

Keep the current React frontend and clinic branding. Replace preview role selection with a server-authenticated staff identity when the backend is connected. Remove development-only controls from the deployed application after their working replacements are verified. Preserve existing appointment/queue behavior while connecting it to shared patient and encounter identities.

## Checklist acceptance evidence

All rows remain **unimplemented as real backend features** until the evidence in the last column is produced.

| Requested capability | Proposed implementation | Required evidence |
| --- | --- | --- |
| Login, logout, passwords and account status | Staff login, server sessions, password change/reset, active/suspended/disabled accounts | Correct/incorrect credentials; expiry; logout revocation; password reset reuse rejection; disabled-account session rejection |
| Role-based access | Server permission checks plus facility/department scope; UI consumes granted permissions | Direct forbidden API calls fail, including changing IDs and posting hidden fields; menu visibility alone does not count |
| Facility, department and staff management | Authorized administrative CRUD; scoped staff assignments; account suspension | Unauthorized CRUD fails; cross-facility access fails; last active administrator cannot be removed accidentally |
| Patient registration, identifier, search, updates and duplicates | Database-generated immutable patient number, UUID primary key, authorized search and versioned updates | Concurrent registration cannot duplicate numbers; updates preserve identity; duplicate conflict is explicit and never silently merges |
| Patient demographics, contacts, next of kin and medical history | Separate demographic and clinical-history API responses with distinct permissions | A demographics-only user cannot read or update clinical history; field validation and update conflict behavior are tested |
| Documents | Private storage, upload validation and quarantine, authorized listing/view/download | Unauthorized ID guessing fails; invalid/oversized content rejected; quarantined files inaccessible; downloads checked independently |
| Audit log | Server-generated events for mutations and sensitive access; mutation and audit event committed together | Actor/time/resource/action/outcome present; failed mutation has no success event; passwords/tokens/clinical text absent from log |

## Proposed data model

These are proposed fields for review, not confirmed clinical requirements.

- **Facility:** ID, display name, code, active status and time zone. **Department:** ID, facility ID, name, code and active status.
- **Staff:** ID, name, normalized unique login email, password hash, account status, password-change requirement and version. **Assignment:** staff ID, facility/department scope and role. Staff account management does not automatically grant clinical record access.
- **Session:** hashed random session identifier, staff ID, created/last-used/expiry timestamps and revocation status. Session permissions come from current server-side assignments, not request fields.
- **Patient:** UUID, immutable database-generated patient number, facility linkage, name, optional date of birth/approved demographic values, contacts, address, next-of-kin details, version and timestamps. Do not use age as a permanent substitute for birth date; unknown dates need an explicit representation agreed with the clinic.
- **Clinical history:** patient ID, allergies, current medicines, medical/surgical history and approved family/social-history fields, version and author timestamps. No diagnosis, treatment or automated clinical decisions are introduced here.
- **Document:** ID, patient ID, classification, generated private storage key, display filename, verified media type, size, checksum, quarantine/scan state, uploader and timestamps. Storage paths are never public API fields.
- **Audit event:** server event ID/time, authenticated actor, facility, action, resource type/ID, outcome and changed field names. Store no passwords, session tokens, uploaded content or clinical field values in the event.

Use database constraints for unique patient numbers and login emails. Use version-based optimistic concurrency for updates. Duplicate candidates require authorized review; matching names alone must not imply that two people are the same patient.

## Permission proposal

This matrix requires clinic confirmation. Role checks must also enforce the assigned facility/department and the specific patient/document scope.

| Capability | Administrator | Reception | Nurse | Doctor | Laboratory | Cashier |
| --- | --- | --- | --- | --- | --- | --- |
| Facility/department/staff administration | Assigned administrative scope | No | No | No | No | No |
| Register/update demographics | Only with explicit patient permission | Assigned scope | Read permitted subset | Read permitted subset | Minimum task-related identity | Minimum billing identity |
| Read/update medical history | No automatic grant | No | Approved clinical scope | Approved clinical scope | No general history access | No |
| Documents | Explicit classification-specific grant | Explicit administrative-document grant | Approved clinical documents | Approved clinical documents | Assigned diagnostic documents | Explicit billing-document grant |
| Download documents | Separate explicit permission for the permitted classification | Same rule | Same rule | Same rule | Same rule | Same rule |
| Review audit events | Explicit audit permission | No | No by default | No by default | No | No by default |

The proposed authorization approach denies access by default and checks every request, including individual record and document requests. This follows [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Draft API contract

Base path: `/api/v1`. Requests/responses use JSON except document transfer. All protected endpoints derive staff identity from the server session. The client cannot select its own authenticated role.

| Method and path | Purpose |
| --- | --- |
| `POST /auth/login` | `{ email, password }`; set session cookie and return staff summary, scope and permissions |
| `GET /auth/session` | Restore the current session; return 401 when absent/expired/revoked |
| `POST /auth/logout` | Revoke the current session and expire its cookie |
| `POST /auth/password/change` | Verify current password; change it; revoke/rotate sessions |
| `POST /auth/password/reset-requests` | Non-enumerating response; approved email or administrator delivery workflow |
| `POST /auth/password/reset` | Consume a single-use expiring reset token |
| `GET/POST /facilities` and `PATCH /facilities/{id}` | Scoped facility management |
| `GET/POST /departments` and `PATCH /departments/{id}` | Scoped department management |
| `GET/POST /staff` and `PATCH /staff/{id}` | Staff accounts, status and scope; restricted writable fields |
| `GET/POST /patients` | Authorized paginated search and registration; server generates identity |
| `GET/PATCH /patients/{id}` | Demographic profile; updates include the expected version |
| `GET/PATCH /patients/{id}/medical-history` | Separate clinical permission and version check |
| `GET/POST /patients/{id}/documents` | Authorized document metadata listing and upload |
| `GET /documents/{id}/view` | Authorized view of released content |
| `GET /documents/{id}/download` | Independent download authorization and attachment response |
| `GET /audit-events` | Restricted, scoped, paginated audit review |

Example error shape:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This record changed. Reload before saving.",
    "fieldErrors": {},
    "requestId": "server-generated-reference"
  }
}
```

Expected statuses include 400/422 for invalid fields, 401 for no valid session, 403 for denied access, 404 for unavailable resources, 409 for duplicate/version conflicts, 413 for oversized uploads, 415 for unsupported file types and 429 for rate limiting. Do not return raw database errors. Resource-not-found behavior must avoid disclosing records outside the caller's scope.

## Authentication and document proposals

Use Argon2id with a unique salt and a reviewed work factor; OWASP's documented baseline includes 19 MiB memory, two iterations and one lane. Benchmark on the deployment host. Never store plaintext passwords or implement password hashing in browser code. See [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Use server-revocable sessions and an HttpOnly, Secure cookie with explicit SameSite policy. Protect state-changing requests against CSRF; do not store session tokens in localStorage. Account suspension, password reset and privilege changes must invalidate applicable sessions. See [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Proposed upload baseline: a small approved type allowlist, size limits, generated storage names, signature/content checks, private storage outside the public web directory and an explicit quarantine/release step. Validate view and download permissions separately. Choose an approved malware-scanning service before allowing live clinical document uploads; do not send clinical files to a public analysis service. See [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Deployment and cleanup decisions still required

1. Clarify whether “metadata” means demonstration records/labels/controls, HTML metadata or named files. Do not delete audit events, real records, source history or required application configuration under an ambiguous cleanup request.
2. Confirm building the planned Go/PostgreSQL service with justified dependencies, or provide the existing backend location and contracts.
3. Identify the hosting target, PostgreSQL service, private document storage and staging/live scope. Secrets must be configured through the host's secret mechanism, never committed or embedded in `VITE_*` variables.
4. Agree on staff bootstrap, reset-message delivery, role/record scope and clinical-history fields. The initial deployment review should use synthetic data.

Once these choices are known, implementation can proceed in reviewable steps: authentication/session and permission enforcement; administration; patient records; documents and durable audit; then complete integration tests and deployment configuration. The checklist cannot be marked complete from UI-only tests.
