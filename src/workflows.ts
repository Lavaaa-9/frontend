import type { Appointment, Patient, QueueEntry, Role } from './mockData.js'

export const staffRoles: Role[] = ['Administrator', 'Reception', 'Nurse', 'Doctor', 'Laboratory', 'Pharmacy', 'Cashier', 'Management']
export const canRegister = (role: Role) => role === 'Reception' || role === 'Administrator'
export const canBook = (role: Role) => ['Administrator', 'Reception', 'Doctor', 'Nurse'].includes(role)
export const canAdvance = (role: Role, stage: QueueEntry['stage']) => role === 'Administrator' ||
  (role === 'Nurse' && (stage === 'Waiting' || stage === 'Triage')) ||
  (role === 'Doctor' && stage === 'Consultation')

export function clinicDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function patientErrors(name: string, age: string, patients: Patient[]) {
  const errors: { name?: string; age?: string } = {}
  const normalized = name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  if (normalized.length < 3) errors.name = 'Enter a fictional name with at least 3 characters.'
  else if (patients.some(p => p.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase() === normalized)) errors.name = 'A sample patient with this name already exists. Review the directory; records have not been merged.'
  if (age.trim() === '' || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 120) errors.age = 'Enter an age in whole years from 0 to 120.'
  return errors
}

export function appointmentConflict(appointments: Appointment[], patientId: string, date: string, time: string) {
  return appointments.some(a => a.patientId === patientId && a.date === date && a.time === time && a.status !== 'Cancelled')
}

export function activeVisit(queue: QueueEntry[], patientId: string, date: string) {
  return queue.find(q => q.patientId === patientId && q.date === date && q.stage !== 'Completed')
}

export const walkInServices = ['General consultation', 'Follow-up review', 'Health screening'] as const
export type WalkInDraft = { patientId: string; service: string }
export type WalkInErrors = { patientId?: string; service?: string; access?: string }
type WalkInResult = { entry: QueueEntry; errors?: never } | { entry?: never; errors: WalkInErrors }

/** Local preview only. This does not check real permissions or create a clinical encounter. */
export function createWalkInVisit(role: Role, patients: Patient[], queue: QueueEntry[], draft: WalkInDraft, now = new Date()): WalkInResult {
  if (!canRegister(role)) return { errors: { access: 'Walk-in check-in is available in the reception and administrator previews.' } }
  const errors: WalkInErrors = {}
  const patient = patients.find(p => p.id === draft.patientId)
  const date = clinicDate(now)
  if (!patient) errors.patientId = 'Select a registered sample patient.'
  else {
    const existing = activeVisit(queue, patient.id, date)
    if (existing) errors.patientId = `This sample patient already has an active visit (${existing.encounterId}, ${existing.stage}). Review the queue before checking in again.`
  }
  if (!walkInServices.some(service => service === draft.service)) errors.service = 'Select a sample visit type.'
  if (!patient || Object.keys(errors).length) return { errors }
  const suffix = crypto.randomUUID().slice(0, 8)
  return { entry: {
    id: `Q-${suffix}`, encounterId: `VIS-${suffix}`, date,
    patientId: patient.id, patientName: patient.name, service: draft.service,
    time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
    stage: 'Waiting',
  } }
}

export function nextStage(stage: QueueEntry['stage']): QueueEntry['stage'] {
  const stages: QueueEntry['stage'][] = ['Waiting', 'Triage', 'Consultation', 'Completed']
  return stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)]
}

export function cancelAppointment(appointments: Appointment[], queue: QueueEntry[], appointmentId: string) {
  const appointment = appointments.find(a => a.id === appointmentId)
  if (!appointment || appointment.status !== 'Confirmed' || queue.some(q => q.appointmentId === appointmentId)) return appointments
  return appointments.map(a => a.id === appointmentId ? { ...a, status: 'Cancelled' as const } : a)
}
