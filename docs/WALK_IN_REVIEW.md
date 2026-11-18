# Synthetic walk-in continuation — 18 November 2026

The user selected synthetic walk-in check-in as the next frontend task. This change reuses React state, shared dialogs/fields and the existing optional appointment linkage in `QueueEntry`. No dependency, framework, API, deployment or commercial-term changes are included.

## Behavior

- Reception and administrator previews can use **Patient Queue → Add demo walk-in** or **Patient preview → Check in demo walk-in**. The latter preserves the selected patient ID.
- A registered sample patient and sample visit type are required. The form also links to the existing registration form.
- Check-in uses today's date and current time in Africa/Dar_es_Salaam, creates a synthetic encounter ID, and starts at Waiting. It updates the sample last-visit label and clears stage filters so the new visit is visible.
- An existing active visit for the patient today blocks another check-in. The form shows its ID/stage and offers to review the queue. It never silently merges visits.
- Completed and previous-day visits do not block a new demonstration visit. Existing appointment records remain unchanged. This prototype does not automatically reconcile an unfulfilled appointment with a separate walk-in.
- Queue rows distinguish Appointment and Walk-in arrivals. Both use the existing provisional nurse/doctor handoffs; completing a walk-in does not complete an unrelated appointment.
- Cancel and Escape close the form without changing records. Refresh discards walk-ins along with all other local edits.

## Changed files

| Files | Change |
| --- | --- |
| `src/App.tsx` | Walk-in entry points, local queue/patient updates, arrival labels and reuse of existing navigation/filter behavior. |
| `src/components/WorkflowForms.tsx` | Shared-modal walk-in form with labeled validation, initial focus, existing-visit review and registration entry. |
| `src/workflows.ts` | Typed local walk-in draft/result, validation and synthetic visit creation. |
| `src/workspace.css` | Wrapping page actions, patient-drawer spacing and a readable duplicate-visit notice. |
| `tests/workflows.test.ts` | Five added tests covering identity, absent appointment linkage, duplicates, existing visits, invalid selections and provisional role actions. |
| `scripts/browser-check.mjs` | Browser checks for entry points, validation, cancellation, mobile layout, handoffs, appointment isolation and refresh reset; four added synthetic screenshots. |
| `README.md`, `FRONTEND_TODO.md`, `docs/FRONTEND_REVIEW.md`, `docs/` | Updated preview instructions, implementation status and verification evidence. |

## Verification

Checks ran on Windows using the existing Node/npm setup and installed Chrome. The latest machine-readable browser result is [browser-check-results.json](browser-check-results.json).

| Command | Actual result |
| --- | --- |
| `npm test` | Passed: 14 tests, 0 failures, including five new walk-in tests. |
| `npm run build` | Passed: strict TypeScript and Vite production build; 1,585 modules transformed. JavaScript: 289.16 kB (86.56 kB gzip); CSS: 38.61 kB (9.22 kB gzip). |
| `node --check scripts/browser-check.mjs` | Passed JavaScript syntax check. |
| `npm run preview -- --strictPort` | Passed: served the production bundle at `http://127.0.0.1:4173/` for browser QA. Stopped after testing. |
| `node scripts/browser-check.mjs http://127.0.0.1:4173` | Passed: 73 browser assertions, no uncaught browser/console errors and no external application requests recorded. |

The browser run includes the existing core-page checks at 320, 390, 768, 1024 and 1440 pixels, plus walk-in validation, cancellation, existing-visit recovery, phone layout, patient-drawer identity, registration-to-walk-in flow, role-sensitive actions, clinical handoffs, unchanged appointment records and reload reset. Seventeen synthetic screenshots are available, including the four new walk-in captures below. The phone form and desktop queue captures were also visually inspected.

The first expanded browser run exposed a test comparison that included role-dependent action buttons. That assertion now compares appointment record columns so the isolation check measures record changes. The final run passed against the built bundle. No dependency inputs changed, so package installation was not repeated in this continuation.

## Synthetic screenshots

- [Walk-in form — desktop](screenshots/walk-in-form-desktop.png)
- [Walk-in form — phone](screenshots/walk-in-form-mobile.png)
- [Existing active visit warning](screenshots/walk-in-conflict-desktop.png)
- [Walk-in queue entry](screenshots/walk-in-queue-desktop.png)

## Limits and next task

This is an in-memory interaction design. It does not authenticate staff, enforce real permissions, reserve clinical capacity, create a real medical encounter or persist a patient record. Sample visit types and the role matrix are provisional. Clinical screens remain design-only, and Go API integration waits for approved contracts.

The local active-visit check does not address concurrent users or real identity reconciliation. Visit corrections, rescheduling, screen-reader testing and physical-device/cross-browser review remain outstanding. The previous report documents the environment's unavailable Git status and Codacy tools.

Next small task: add a read-only synthetic visit timeline in the patient preview using existing patient and encounter IDs. Confirm registration fields and role permissions with clinic stakeholders before integrating real workflows.
