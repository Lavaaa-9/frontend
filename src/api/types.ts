/** Contract: Lavaaa-9/backend, commit 8ddee1d, api/openapi/openapi.json. */
export interface StaffUser {
  id: string; email: string; display_name: string; role: string; active: boolean; version: number; facility_ids: string[]
}
export interface Actor extends StaffUser { permissions: string[]; mfa_verified: boolean }
export interface Tokens { access_token: string; token_type: 'Bearer'; expires_in: number; user: StaffUser }
export interface Challenge { mfa_required: true; challenge_token: string; expires_in: number }
export interface Facility { id: string; name: string; timezone: string; active: boolean }
export interface Demographics {
  given_name: string; family_name: string; birth_precision: 'exact' | 'year' | 'unknown'
  birth_date?: string | null; birth_year?: number | null; phone: string; address: string
}
export interface Patient extends Demographics {
  id: string; mrn: string; facility_id: string; version: number; created_at: string; updated_at: string
}
export interface Page<T> { items: T[]; next_cursor: string }
export interface AuditEvent {
  id: number; actor_id: string | null; action: string; resource_id: string | null; patient_id: string | null
  request_id: string; reason: string | null; facility_id: string | null; outcome: string; created_at: string
}
export interface StaffSession {
  id: string; client_type: string; created_at: string; expires_at: string; revoked_at: string | null; last_seen_at: string; device_label: string
}
export interface StaffDraft { email: string; display_name: string; password: string; role: string; facility_ids: string[] }
export type StaffUpdate = Omit<StaffDraft, 'email' | 'password'> & { active: boolean; version: number }
export interface Enrollment { secret: string; provisioning_uri: string }

export function can(actor: Actor, permission: string) { return actor.active && actor.permissions.includes(permission) }
export function patientName(patient: Pick<Patient, 'given_name' | 'family_name'>) { return `${patient.given_name} ${patient.family_name}` }
export function birthLabel(patient: Demographics) {
  if (patient.birth_precision === 'exact') return patient.birth_date || 'Not recorded'
  if (patient.birth_precision === 'year') return patient.birth_year ? `Approximately ${patient.birth_year}` : 'Not recorded'
  return 'Not recorded'
}
export function clinicDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
