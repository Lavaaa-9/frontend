import { useState } from 'react'
import type { FormEvent } from 'react'
import { Info, Plus } from 'lucide-react'
import type { Appointment, Patient, QueueEntry } from '../mockData'
import { activeVisit, appointmentConflict, clinicDate, patientErrors, walkInServices } from '../workflows'
import type { WalkInDraft, WalkInErrors } from '../workflows'
import { FormField, Modal } from './ui'

export function PatientForm({ patients, close, create }: {
  patients: Patient[]; close: () => void; create: (name: string, age: number, sex: Patient['sex']) => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Patient['sex']>('Female')
  const [errors, setErrors] = useState<ReturnType<typeof patientErrors>>({})
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = patientErrors(name, age, patients)
    setErrors(next)
    if (Object.keys(next).length) {
      const form = event.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    create(name.trim().replace(/\s+/g, ' '), Number(age), sex)
  }
  return <Modal title="Register patient" subtitle="UI-only form · fictional details only" close={close}>
    <form onSubmit={submit} className="modal-form" noValidate>
      <FormField id="patient-name" label="Full name (required)" error={errors.name}>
        <input data-initial-focus id="patient-name" autoComplete="off" value={name} onChange={e => setName(e.target.value)} required maxLength={80}
          placeholder="Enter fictional patient name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'patient-name-error' : undefined}/>
      </FormField>
      <div className="field-row"><FormField id="patient-sex" label="Sex (required)">
        <select id="patient-sex" value={sex} onChange={e => setSex(e.target.value as Patient['sex'])} required><option>Female</option><option>Male</option></select>
      </FormField><FormField id="patient-age" label="Age in years (required)" error={errors.age}>
        <input id="patient-age" type="number" inputMode="numeric" min="0" max="120" step="1" value={age} onChange={e => setAge(e.target.value)} required
          aria-invalid={!!errors.age} aria-describedby={errors.age ? 'patient-age-error' : undefined}/>
      </FormField></div>
      <div className="form-notice"><Info size={16}/>Use fictional details only. Registration fields and the role matrix need clinic approval. Duplicate names are flagged locally; no records are merged.</div>
      <div className="form-actions"><button type="button" className="button outline" onClick={close}>Cancel</button>
        <button className="button primary" type="submit"><Plus size={17}/> Add demo patient</button></div>
    </form>
  </Modal>
}

export type AppointmentDraft = { patientId: string; reason: string; date: string; time: string }

export function WalkInForm({ patients, queue, initialPatientId, close, create, reviewQueue, registerPatient }: {
  patients: Patient[]; queue: QueueEntry[]; initialPatientId: string; close: () => void
  create: (draft: WalkInDraft) => WalkInErrors | undefined; reviewQueue: () => void; registerPatient: () => void
}) {
  const [draft, setDraft] = useState<WalkInDraft>({ patientId: initialPatientId, service: walkInServices[0] })
  const [errors, setErrors] = useState<WalkInErrors>({})
  const existing = activeVisit(queue, draft.patientId, clinicDate())
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = create(draft)
    if (!next) return
    setErrors(next)
    const form = event.currentTarget
    requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus())
  }
  return <Modal title="Walk-in check-in" subtitle="Synthetic visit only · no appointment is created" close={close}>
    <form className="modal-form" onSubmit={submit} noValidate>
      <div className="form-notice"><Info size={16}/><span>Today, {clinicDate()} · East Africa Time (UTC+3). Check-in uses the current clinic time and starts this demo visit in Waiting.</span></div>
      {errors.access && <p className="field-error" role="alert" tabIndex={-1}>{errors.access}</p>}
      <FormField id="walk-in-patient" label="Registered patient (required)" error={errors.patientId}>
        <select data-initial-focus id="walk-in-patient" required value={draft.patientId}
          onChange={e => { setDraft(prev => ({ ...prev, patientId: e.target.value })); setErrors({}) }}
          aria-invalid={!!errors.patientId} aria-describedby={errors.patientId ? 'walk-in-patient-error' : undefined}>
          <option value="">Select demo patient</option>{patients.map(p => <option value={p.id} key={p.id}>{p.name} · {p.id}</option>)}
        </select>
      </FormField>
      {existing && <div className="walk-in-conflict"><p>Active demo visit: <b>{existing.encounterId}</b> · {existing.stage}</p>
        <button type="button" className="button outline" onClick={reviewQueue}>Review existing visit in queue</button>
      </div>}
      <FormField id="walk-in-service" label="Visit type (required)" error={errors.service}>
        <select id="walk-in-service" required value={draft.service} onChange={e => setDraft(prev => ({ ...prev, service: e.target.value }))}
          aria-invalid={!!errors.service} aria-describedby={errors.service ? 'walk-in-service-error' : undefined}>
          {walkInServices.map(service => <option key={service}>{service}</option>)}
        </select>
      </FormField>
      <p className="field-hint">Not registered yet? <button type="button" className="inline-button" onClick={registerPatient}>Register a demo patient</button> first, then select them for check-in.</p>
      <div className="form-notice"><Info size={16}/><span>Fictional patients only. This creates a visit in browser memory, without checking provider availability. Refresh discards it. Clinical assessment and real API permissions are not connected.</span></div>
      <div className="form-actions"><button className="button outline" type="button" onClick={close}>Cancel</button>
        <button className="button primary" type="submit">Check in demo walk-in</button></div>
    </form>
  </Modal>
}

export function AppointmentForm({ patients, appointments, initialPatientId, close, create }: {
  patients: Patient[]; appointments: Appointment[]; initialPatientId: string; close: () => void; create: (draft: AppointmentDraft) => void
}) {
  const [draft, setDraft] = useState<AppointmentDraft>({ patientId: initialPatientId, reason: 'General consultation', date: clinicDate(), time: '10:00' })
  const [errors, setErrors] = useState<Partial<Record<keyof AppointmentDraft, string>>>({})
  const update = (field: keyof AppointmentDraft, value: string) => setDraft(prev => ({ ...prev, [field]: value }))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    if (!patients.some(p => p.id === draft.patientId)) next.patientId = 'Select a sample patient.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date < clinicDate()) next.date = 'Choose today or a future date in clinic time.'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) next.time = 'Choose a valid appointment time.'
    else if (appointmentConflict(appointments, draft.patientId, draft.date, draft.time)) next.time = 'This sample patient already has an appointment at this date and time.'
    setErrors(next)
    if (Object.keys(next).length) {
      const form = event.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    create(draft)
  }
  return <Modal title="New appointment" subtitle="Create an in-memory demonstration appointment" close={close}>
    <form onSubmit={submit} className="modal-form" noValidate>
      <FormField id="app-patient" label="Patient (required)" error={errors.patientId}>
        <select data-initial-focus id="app-patient" value={draft.patientId} onChange={e => update('patientId', e.target.value)} required
          aria-invalid={!!errors.patientId} aria-describedby={errors.patientId ? 'app-patient-error' : undefined}>
          <option value="">Select demo patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}
        </select>
      </FormField>
      <FormField id="app-reason" label="Visit type"><select id="app-reason" value={draft.reason} onChange={e => update('reason', e.target.value)}>
        <option>General consultation</option><option>Follow-up review</option><option>Health screening</option><option>Telemedicine consultation</option>
      </select></FormField>
      <div className="field-row"><FormField id="app-date" label="Date (required)" error={errors.date}>
        <input id="app-date" type="date" min={clinicDate()} value={draft.date} onChange={e => update('date', e.target.value)} required
          aria-invalid={!!errors.date} aria-describedby={errors.date ? 'app-date-error' : undefined}/>
      </FormField><FormField id="app-time" label="Time (required)" error={errors.time}>
        <input id="app-time" type="time" value={draft.time} onChange={e => update('time', e.target.value)} required
          aria-invalid={!!errors.time} aria-describedby={errors.time ? 'app-time-error' : undefined}/>
      </FormField></div>
      <div className="form-notice"><Info size={16}/>Clinic time: East Africa Time (UTC+3). Provider is unassigned. Local duplicate checking does not validate provider availability or reserve a real slot.</div>
      <div className="form-actions"><button type="button" className="button outline" onClick={close}>Cancel</button>
        <button className="button primary" type="submit">Add demo appointment</button></div>
    </form>
  </Modal>
}
