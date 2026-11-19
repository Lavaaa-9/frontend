# Spartial staff interface blueprint

Working design only. Use synthetic records. Clinical workflows and role assignments require clinic approval before API integration.

Use the supplied logo and blue `#003DB8`, red `#E50012`, green `#00872A`, background `#F6F8FC` and white surfaces. Preserve visible labels, readable text, keyboard focus, table headings, native modal focus containment and responsive table scrolling. Status always has text. Avoid implying that frontend role visibility secures patient records.

The patient and visit identities connect reception → triage → consultation → laboratory/pharmacy requests. A completed consultation emits only the requests manually entered by the reviewer. Drafts emit no requests. No clinical recommendations or automatic diagnoses are generated.

Core areas: Dashboard, Patients, Appointments, Patient Queue, Nursing, Consultations, Laboratory, Pharmacy, Billing, Telemedicine, Reports, Staff/Settings and My Account. Page URLs use `#/area`; clinic cards use `#/patients/id`. Forms remain dialogs/panels where a separate detail route is not implemented.

The provisional demo roles are Administrator, Reception, Nurse, Doctor, Laboratory, Pharmacy, Cashier and Management. Reception creates arrivals; nurses advance triage; doctors complete consultations; laboratory and pharmacy staff update their own requests. Cashier and management previews do not browse patient records. Medical-history tabs are visible only to nurse/doctor previews. Administrator role selection is a UI test control, not an authenticated grant.

Keep loading, empty, failure, success and access-denied designs available. Never report successful API mutations on failure. Demo notifications explicitly describe local state. Account changes, document handling, auditing, provider availability, video services and financial rules all need approved backend contracts.

See FRONTEND_TODO.md and docs/QA_REPORT.md for limitations and actual test status.
