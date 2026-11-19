# Frontend implementation status

The master development prompt is the current scope: synthetic frontend first; backend integration deferred. No stage is accepted merely because its source compiles.

| Stage | Implemented in source | Verification / remaining work |
| --- | --- | --- |
| 1. Stability and architecture | Restored shared UI compatibility; in-memory repository; hash navigation and 404; shared form/table/dialog/error controls | Latest full TypeScript check passes. Detail routes and further component extraction remain. |
| 2. Login and dashboard | One login, labelled demo/API modes, unavailable API state, role navigation, derived counts and local activity | Browser run covered the login and original dashboard before the final dashboard changes. Final visual rerun declined. |
| 3. Reception | Registration, edit/contact fields, clinic card, duplicate warning, appointment booking/reschedule/day agenda, check-in and walk-ins | Existing unit tests pass. Browser runs found route-lifecycle regressions; code fixes await rerun. Documents are fictional plain text in memory. |
| 4. Clinical design | Nursing/consultation drafts, visit-linked sample lab and prescription requests, result and dispensing simulations | Pure consultation rules tested. New form journey and accessibility checks await browser execution and clinic field approval. No clinical acceptance. |
| 5. Operations | Demo billing, receipt/CSV, reports, staff/departments/settings/reset, account and telemedicine design | Billing arithmetic tested. Screens, printing, downloads and mobile layouts require final browser checks. No live services. |
| 6. Quality assurance | 32 unit tests; expanded browser script; QA and integration documentation | Latest production build rerun and browser rerun were declined. Codacy tools unavailable. No production readiness claim. |

Next small task: run the current browser script with permission, fix any remaining route/focus issues, verify the new synthetic clinical-to-billing journey and capture current desktop/mobile screenshots. Then review clinical fields and the provisional role matrix with authorised clinic staff.

Additional work: separate URLs for all detail panels; genuine staff assignments/care scope; approved medical history, document formats and result verification; line-item invoices/taxes/payment history; calendar month/week views; richer reports; real password recovery and staging contract tests. These are not represented as completed features.
