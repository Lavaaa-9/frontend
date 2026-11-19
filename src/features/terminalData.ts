import type { Role } from '../mockData.js'

type AvailableTerminal = {
  id: string
  title: string
  description: string
  action: string
  screen: 'team' | 'patients' | 'consultations' | 'laboratory' | 'triage' | 'pharmacy'
  role: Role
}

type PendingTerminal = {
  id: string
  title: string
  description: string
  action: string
  screen?: never
  role?: never
}

export type Terminal = AvailableTerminal | PendingTerminal

/** Terminal order follows the supplied landing-page reference. No access grants are made here. */
export const terminals: readonly Terminal[] = [
  { id: 'back-office', title: 'Back Office', description: 'Manage staff accounts, facility settings and clinic operations.', action: 'Go to Back Office', screen: 'team', role: 'Administrator' },
  { id: 'reception', title: 'Reception Terminal', description: 'Patient registration, appointments, check-in and billing.', action: 'Go to Reception Terminal', screen: 'patients', role: 'Reception' },
  { id: 'doctor', title: 'Doctor Terminal', description: 'Review patient visits and open the consultation workspace.', action: 'Go to Doctor Terminal', screen: 'consultations', role: 'Doctor' },
  { id: 'laboratory', title: 'Lab Terminal', description: 'View investigation requests and enter demonstration results.', action: 'Go to Lab Terminal', screen: 'laboratory', role: 'Laboratory' },
  { id: 'nurse', title: 'Nurse Terminal', description: 'Patient waiting lists, triage observations and nursing handoffs.', action: 'Go to Nurse Terminal', screen: 'triage', role: 'Nurse' },
  { id: 'radiology', title: 'Radiology Terminal', description: 'Radiology imaging requests, examinations and reports.', action: 'View Radiology Design' },
  { id: 'theatre', title: 'Theatre Terminal', description: 'Procedure scheduling and operating theatre coordination.', action: 'View Theatre Design' },
  { id: 'dialysis', title: 'Dialysis Terminal', description: 'Dialysis appointments and treatment workflow planning.', action: 'View Dialysis Design' },
  { id: 'physiotherapy', title: 'Physiotherapy Terminal', description: 'Physiotherapy sessions and rehabilitation care planning.', action: 'View Physiotherapy Design' },
  { id: 'ipd', title: 'IPD Terminal', description: 'Inpatient admissions, ward information and care coordination.', action: 'View IPD Design' },
  { id: 'pharmacy', title: 'Pharmacy Terminal', description: 'Review prescription requests and simulated dispensing.', action: 'Go to Pharmacy Terminal', screen: 'pharmacy', role: 'Pharmacy' },
]
