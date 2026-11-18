# Spartial Healthcare Workspace — Web UI Starter

A responsive **React + TypeScript + Vite** interface design starter for **Spartial Specialized Polyclinic**. Prepared as an initial UI/UX prototype for the team developing the full clinic system.

## Brand colors

This edition uses the clinic logo supplied by the project owner. The palette is blue `#003DB8` for primary buttons/navigation, red `#E50012` for brand/urgent accents and green `#00872A` for positive states. White and off-white backgrounds keep clinical pages readable. `src/brand-theme.css` contains the overridable theme, and `public/spartial-logo.jpg` is the supplied logo.

## What you can preview now

- Staff preview landing screen (select any demo role and enter interface; **not real authentication**)
- Responsive desktop/mobile application shell and role-filtered navigation (preview only, **not a security feature**)
- Dashboard with synthetic statistics, appointments and queue stage overview
- Patient directory with search, status filter, add-demo-patient form and patient preview drawer
- Appointments with dated bookings, local duplicate warnings and confirmed cancellation
- Appointment check-in creates a linked synthetic queue visit (today only)
- Walk-in check-in creates a synthetic visit for a registered sample patient without creating an appointment
- Queue with stage filters, provisional role actions and confirmed stage progression
- Native modal forms, patient drawer and mobile navigation with keyboard focus handling
- Loading, empty, failure and access-denied designs via the screen-state preview control
- Navigation-ready blueprint screens for triage, consultations, laboratory, pharmacy, billing, telemedicine, reports, staff and settings

**Important: This is not a clinical application.** All patients are fictional fixtures; changes are in component state and disappear on refresh. No Go API, database, authorization or medical record features are implemented yet. Do not put real patient details in this preview.

## Run on Windows 11 / VS Code

You need Node.js 20.19+ or Node.js 22.12+ for newer Vite releases. Open the extracted folder in VS Code Terminal (PowerShell):

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

For a production build check:

```powershell
npm run build
npm test
```

## Where to put it in the main repository

```text
Spartial-Healthcare-System/
├── AGENTS.md
├── PHASES.md
├── backend/                # Planned Go/Gin APIs
├── web/                    # Copy THIS starter's files here
├── mobile/                 # Planned patient application
└── docs/
    └── UI_UX_BLUEPRINT.md
```

**Note:** If `web/` already contains code, inspect it first and merge changes carefully rather than overwriting it.

## Planned frontend/backend boundary

- Keep synthetic fixtures only while iterating on UI.
- At the approved integration milestone, replace fixture state with typed `fetch`/API adapters for Go/Gin.
- Authentication, authorization, record isolation and audit logging belong in the backend. Role-filtered menus alone are not secure.
- The AI agent should read the root `AGENTS.md` and `PHASES.md` for overall project rules, but keep project commercial values out of public screenshots and shared UI material.
- Final clinical labels, fields, role permissions and branding must be confirmed with Spartial's authorized project stakeholders.

See `UI_UX_BLUEPRINT.md` for screen definitions and design system.

## Frontend continuation and checks

The lockfile records the existing dependencies; no new packages were added. `npm ci` is the repeatable install command; use `npm install` only when intentionally updating dependency inputs. Node 22.19.0 / npm 10.9.3 was used for this Windows check. Development and preview servers bind to `127.0.0.1` by default. System font fallbacks keep the preview independent of a remote font service.

`npm test` compiles focused workflow tests and runs Node's built-in test runner. Output goes into ignored `.test-dist/`. No additional test dependency is needed.

For a local browser smoke check, start `npm run dev` in one terminal, then run this in another:

```powershell
node scripts/browser-check.mjs
```

This uses an already installed Chrome or Edge in headless mode. Set `$env:SPARTIAL_BROWSER` to another installed Chromium executable if necessary. The script only accepts a localhost URL, uses a separate ignored `.qa-browser/` profile, closes the browser it starts, and writes synthetic screenshots and a check report under `docs/`. It does not install a browser or any package. Browser launch may require permission in a restricted agent environment. Stop the dev server with Ctrl+C afterward.

Shared controls are in `src/components/ui.tsx`; the registration, booking and walk-in forms are in `src/components/WorkflowForms.tsx`. `src/workflows.ts` contains the testable local validation and provisional action rules. All records still live in React state: there is no localStorage, database, session or Go API adapter.

## Try the synthetic walk-in flow

1. Enter the Reception or Administrator preview.
2. Open **Patient Queue → Add demo walk-in**, or open a patient preview and choose **Check in demo walk-in**.
3. Select a registered fictional patient and sample visit type, then check in. The visit starts in Waiting with a synthetic visit ID and the current East Africa Time. No appointment is created.
4. If the patient already has an active visit today, the form shows that visit and provides a queue review action. It does not create a duplicate or merge visits.

The queue labels each arrival as Appointment or Walk-in. Walk-ins use the same provisional nurse/doctor handoffs. Completing one leaves existing appointments unchanged. All changes disappear on refresh. Visit types, roles and production behavior still need clinic approval.

See [frontend review](docs/FRONTEND_REVIEW.md) for actual results, limitations, screenshots and the next task.
The latest continuation is documented in [walk-in review](docs/WALK_IN_REVIEW.md).

If installation reports audit warnings, see the [dependency audit review](docs/DEPENDENCY_AUDIT.md) for the verified findings and remediation status as of 18 November 2026. An install completing successfully does not imply a clean audit.
