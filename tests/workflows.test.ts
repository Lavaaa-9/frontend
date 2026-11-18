import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialAppointments, initialPatients, initialQueue } from '../src/mockData.js'
import { activeVisit, appointmentConflict, cancelAppointment, canAdvance, canBook, canRegister, clinicDate, createWalkInVisit, nextStage, patientErrors } from '../src/workflows.js'

test('registration rejects blank/fractional ages but accepts a newborn', () => {
  assert.ok(patientErrors('Sample Person', '', []).age)
  assert.ok(patientErrors('Sample Person', '2.5', []).age)
  assert.ok(patientErrors('Sample Person', '121', []).age)
  assert.deepEqual(patientErrors('Sample Person', '0', []), {})
})
test('duplicate name warning normalizes case and whitespace without merging records', () => {
  assert.ok(patientErrors('  AMINA   M. ', '32', initialPatients).name)
  assert.equal(initialPatients.length, 6)
})
test('appointment conflicts include date and ignore cancelled bookings', () => {
  const a = initialAppointments[0]
  assert.equal(appointmentConflict(initialAppointments, a.patientId, a.date, a.time), true)
  assert.equal(appointmentConflict(initialAppointments, a.patientId, '2099-01-01', a.time), false)
  assert.equal(appointmentConflict([{...a,status:'Cancelled'}], a.patientId, a.date, a.time), false)
})
test('checked-in appointments cannot be cancelled; a confirmed booking can', () => {
  assert.equal(cancelAppointment(initialAppointments, initialQueue, 'AP-1001'), initialAppointments)
  const result = cancelAppointment(initialAppointments, initialQueue, 'AP-1005')
  assert.equal(result.find(a=>a.id==='AP-1005')?.status, 'Cancelled')
  assert.equal(initialAppointments.find(a=>a.id==='AP-1005')?.status, 'Confirmed')
})
test('active visit guard excludes completed visits and other dates', () => {
  const q = initialQueue[0]
  assert.equal(activeVisit(initialQueue,q.patientId,q.date)?.encounterId,q.encounterId)
  assert.equal(activeVisit([{...q,stage:'Completed'}],q.patientId,q.date),undefined)
  assert.equal(activeVisit(initialQueue,q.patientId,'2099-01-01'),undefined)
})
test('provisional role actions match reception and clinical handoffs', () => {
  assert.equal(canRegister('Reception'),true)
  assert.equal(canRegister('Doctor'),false)
  assert.equal(canBook('Cashier'),false)
  assert.equal(canAdvance('Reception','Waiting'),false)
  assert.equal(canAdvance('Nurse','Waiting'),true)
  assert.equal(canAdvance('Nurse','Consultation'),false)
  assert.equal(canAdvance('Doctor','Consultation'),true)
})
test('queue progression stops at completed', () => {
  assert.equal(nextStage('Waiting'),'Triage')
  assert.equal(nextStage('Triage'),'Consultation')
  assert.equal(nextStage('Consultation'),'Completed')
  assert.equal(nextStage('Completed'),'Completed')
})
test('fixture visits have matching patient and appointment identities', () => {
  for (const q of initialQueue) {
    const appointment = initialAppointments.find(a=>a.id===q.appointmentId)
    assert.equal(appointment?.patientId,q.patientId)
    assert.equal(appointment?.date,q.date)
    assert.ok(initialPatients.some(p=>p.id===q.patientId))
  }
})
test('clinic day uses Tanzania time at the UTC date boundary', () => {
  assert.equal(clinicDate(new Date('2026-11-17T22:30:00Z')),'2026-11-18')
})

const fixtureTime = new Date(`${initialQueue[0].date}T12:00:00+03:00`)
test('walk-in creates a waiting visit for the registered identity without an appointment or fixture mutation', () => {
  const before = JSON.stringify({ patients: initialPatients, queue: initialQueue, appointments: initialAppointments })
  const result = createWalkInVisit('Reception', initialPatients, initialQueue, { patientId: 'SP-00024', service: 'Health screening' }, fixtureTime)
  assert.ok(result.entry)
  assert.equal(result.entry.patientId, 'SP-00024')
  assert.equal(result.entry.patientName, 'David M.')
  assert.equal(result.entry.service, 'Health screening')
  assert.equal(result.entry.stage, 'Waiting')
  assert.equal(result.entry.appointmentId, undefined)
  assert.match(result.entry.encounterId, /^VIS-/)
  assert.equal(result.entry.date, initialQueue[0].date)
  assert.equal(result.entry.time, '12:00')
  assert.equal(JSON.stringify({ patients: initialPatients, queue: initialQueue, appointments: initialAppointments }), before)
})
test('walk-in rejects another active visit and identifies the existing visit for review', () => {
  const result = createWalkInVisit('Reception', initialPatients, initialQueue, { patientId: 'SP-00021', service: 'General consultation' }, fixtureTime)
  assert.equal(result.entry, undefined)
  assert.match(result.errors!.patientId!, /VIS-1001, Consultation/)
})
test('completed visits and visits from other days do not block a new walk-in', () => {
  assert.ok(createWalkInVisit('Administrator', initialPatients, initialQueue, { patientId: 'SP-00025', service: 'Follow-up review' }, fixtureTime).entry)
  const previousDayQueue = initialQueue.map(q => ({ ...q, date: '2000-01-01' }))
  assert.ok(createWalkInVisit('Reception', initialPatients, previousDayQueue, { patientId: 'SP-00021', service: 'General consultation' }, fixtureTime).entry)
})
test('walk-in rejects an unknown patient and an unsupported visit type', () => {
  const result = createWalkInVisit('Reception', initialPatients, initialQueue, { patientId: 'SP-unknown', service: 'Unapproved service' }, fixtureTime)
  assert.equal(result.entry, undefined)
  assert.ok(result.errors?.patientId)
  assert.ok(result.errors?.service)
})
test('walk-in helper applies the provisional reception/admin action restriction', () => {
  for (const role of ['Nurse', 'Doctor', 'Cashier', 'Laboratory'] as const) {
    const result = createWalkInVisit(role, initialPatients, initialQueue, { patientId: 'SP-00024', service: 'General consultation' }, fixtureTime)
    assert.equal(result.entry, undefined)
    assert.ok(result.errors?.access)
  }
})
