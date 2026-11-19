# Spartial Healthcare Workspace

React 19, TypeScript and Vite 6 frontend for Spartial Specialized Polyclinic, maintained for Lavaa Tech Solutions. The current assignment is a **synthetic demonstration**, with backend integration deferred. No backend or database was created or modified.

## Run in Windows / VS Code

Use Node.js 22.12 or later (checked with Node 22.19.0 and npm 10.9.3). Open PowerShell in this folder:

```powershell
npm ci
npm run dev
```

Open the address printed by Vite, usually `http://127.0.0.1:5173`. If that port is occupied Vite chooses another port. To check the frontend:

```powershell
npm test
npm run build
node scripts/browser-check.mjs http://127.0.0.1:5173
```

The browser check requires an installed Chrome or Edge. `SPARTIAL_BROWSER` can point to another Chromium executable. It uses a separate `.qa-browser` profile, closes its own browser, and writes only synthetic screenshots under `docs/screenshots`. The script now records both failed and successful runs in `docs/browser-check-results.json`. It never accepts a remote test target. See [the current QA report](docs/QA_REPORT.md) for actual results and checks still awaiting permission.

## Demonstration workflows

Choose **Demo Mode**, select a fictional staff role and enter the workspace. There is no real sign-in. Change the role preview in the header to follow handoffs. All changes stay in memory and disappear on reload. An administrator preview can restore initial fixtures under Settings → Reset demo data. Exit via the sidebar or My Account.

- Patients: search name/ID/phone, filter, sort, register, edit contacts/next of kin, open a clinic card, review visits, and attach/view/download fictional text documents (100 KB maximum). Medical history editing is limited to the nurse and doctor previews.
- Appointments: book, choose a sample department/doctor, filter statuses, inspect the day agenda, reschedule, cancel with confirmation and check in today's confirmed visits.
- Queue: appointment and walk-in visits retain their patient IDs. Duplicate active visits are blocked locally. Nurse and doctor previews move visits through stages.
- Clinical design previews: nursing observations and consultation drafts are keyed by visit. Completing a consultation creates the entered fictional laboratory and pharmacy requests. Laboratory and pharmacy previews can update their respective request statuses. No diagnosis, prescribing advice, code lookup or stock management is performed.
- Operations: sample invoices, exact decimal payment simulations, printable demonstration receipts, date-filtered operational summaries and CSV export. These are not financial records or payment processing.
- Administration: fictional staff accounts, role assignments, departments, facility display name, local activity preview and reset. The activity preview is not a durable audit log. Staff accounts do not authenticate the role selector.
- Telemedicine: remote appointment schedule and session interface design. No camera, microphone or video connection is started.
- Account: fictional profile and password-form validation. The demo never claims a password was changed.

Routes use hashes, for example `#/patients`, `#/patients/SP-00021`, `#/queue`, `#/consultations`, `#/billing` and `#/settings`. Unknown areas display a 404 state; inaccessible areas display a role-preview denial. Subforms remain dialogs or panels; not every detail has a separate URL yet.

## Data boundary

`src/demo/repository.ts` owns synthetic state; `src/demo/operations.ts` contains testable clinical and billing operations. The retained reception rules are in `src/workflows.ts`. `src/features` contains the additional demonstration screens. Shared controls live in `src/components/ui.tsx`.

One login component in `src/pages/Auth.tsx` serves both modes. The default `VITE_DATA_MODE=demo` makes no API requests. The API tab shows its unavailable state in this build; it never substitutes mock success for a failed sign-in.

`src/api`, `src/hooks.ts`, `src/app/ApiWorkspace.tsx`, and the existing API pages in `src/pages` are retained as a **future integration adapter**. They are not live-tested or clinic-approved. Do not set `VITE_DATA_MODE=api` for clinical use. Read [the integration boundary](docs/BACKEND_INTEGRATION.md) before any approved staging trial. Never place secrets in `VITE_*` values.

The backend repository previously supplied by the owner uses Fiber at the inspected revision; the master prompt describes a future Gin backend. Frontend code must follow approved HTTP contracts, not assume those frameworks expose identical endpoints.

## Hosting

No deployment was performed. A static server can serve the generated `dist` directory after a verified build. Hash routes do not require server rewrites for individual pages. `npm run preview` is a local review server, not production hosting. Do not expose this demonstration as a clinical records system or enter real patient information.

No dependencies were added or version ranges changed. The existing [dependency audit](docs/DEPENDENCY_AUDIT.md) records four unresolved high-severity development-tool findings from the earlier audit. A successful install/build is not a clean security assessment.

See [the task tracker](FRONTEND_TODO.md) and [the UI blueprint](UI_UX_BLUEPRINT.md). Clinical field approval, role policy acceptance, final browser regression tests, assistive-technology review and backend integration remain outstanding.
