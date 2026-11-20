# Frontend audit and preparation status

## Audit

No `AGENTS.md` or `PHASES.md` was present in the supplied workspace. The original default entry (`src/App.tsx`) mounted the synthetic demo and included role selection, locally generated identifiers, dashboard counts, patient registration, appointments and queue changes. `src/mockData.ts` contains fictional patients, appointments and queue fixtures. `src/demo/repository.ts` and `src/demo/operations.ts` contain in-memory data and simulated staff, clinical and billing transactions. `src/features/Clinical.tsx`, `Operations.tsx`, `Account.tsx`, `PatientCard.tsx`, `Telemedicine.tsx`, `TerminalLanding.tsx`, `terminalData.ts`, `src/components/WorkflowForms.tsx`, `src/workflows.ts` and demo-only parts of `src/components/ui.tsx` supported those screens. These files are retained for reference and legacy synthetic tests but are not mounted by the current entry point. Git history contains the former app.

The separate `src/api`, `src/hooks.ts`, `src/pages` and `src/app/ApiWorkspace.tsx` adapter targets an older backend contract. `sessionStorage` in `src/hooks.ts` stores only a non-medical lock flag; no medical records or passwords were found in browser storage. No automatic API-to-demo fallback was found. `src/components/ErrorBoundary.tsx` contained demo-specific messaging, now replaced. The prior screenshots and browser script represent the demo and must not be treated as current QA.

## Completed preparation

- Removed the synthetic application from the production entry point; closed the legacy backend gate pending a verified contract and CSRF implementation.
- Prepared sign-in, password visibility, unavailable and recovery guidance, error mapping, session-state hooks and permission-aware scaffolding. The existing session and account adapter is unverified and unreachable behind the gate.
- Added routes for the requested modules. Unimplemented areas show an unavailable message after authentication is eventually integrated; they do not create or display records. These placeholders are not complete workflows, forms or API integrations.
- Documented proposed backend capabilities and security decisions in `docs/BACKEND_INTEGRATION.md`.

## Remaining

Agree the Gin API and security contract; implement CSRF and authentication; integrate each module with typed models and permission rules; provide complete forms, loading, empty and failure states; validate the end-to-end patient journey and every authorization boundary. Move or remove retained demo fixtures when their historical tests are replaced by tests of real integration behavior. Add browser-level tests for login, route protection, registration, appointments, queue and accessibility; legacy synthetic tests do not establish those behaviors. Complete responsive and assistive-technology review, dependency/security review, and authorized staging tests before any clinical deployment. The old browser script must be replaced or updated before use.
