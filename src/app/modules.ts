/** Permissions are specified only for the previously inspected adapter contract.
 * Unconnected modules expose no data or actions and need an approved policy. */
export interface ModuleRoute { id: string; title: string; permission?: string; connected?: boolean }

export const modules: readonly ModuleRoute[] = [
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'patients', title: 'Patient management', permission: 'patients.read', connected: true },
  { id: 'reception', title: 'Reception' },
  { id: 'appointments', title: 'Appointments' },
  { id: 'queue', title: 'Patient queue' },
  { id: 'triage', title: 'Nursing and triage' },
  { id: 'consultations', title: 'Doctor consultations' },
  { id: 'laboratory', title: 'Laboratory' },
  { id: 'pharmacy', title: 'Pharmacy' },
  { id: 'billing', title: 'Billing' },
  { id: 'telemedicine', title: 'Telemedicine' },
  { id: 'reports', title: 'Reports' },
  { id: 'team', title: 'Staff accounts', permission: 'staff.read', connected: true },
  { id: 'settings', title: 'Facilities', permission: 'facilities.read', connected: true },
  { id: 'audit', title: 'Audit log', permission: 'audit.read', connected: true },
  { id: 'account', title: 'Account and security', connected: true },
]

export function findModule(id: string) { return modules.find(module => module.id === id) }

export function mayOpenModule(module: ModuleRoute, permissions: readonly string[]) {
  return !module.permission || permissions.includes(module.permission)
}
