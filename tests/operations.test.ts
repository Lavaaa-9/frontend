import test from 'node:test'
import assert from 'node:assert/strict'
import { initialOperations, moneyMinor, recordPayment, saveConsultation, canUseClinical } from '../src/demo/operations.js'
import type { Consultation, Invoice } from '../src/demo/operations.js'
import { initialQueue } from '../src/mockData.js'

const visit=initialQueue.find(q=>q.stage==='Consultation')!
const draft:Consultation={visitId:visit.encounterId,symptoms:'Fictional observation',diagnosis:'Sample only',icd:'',plan:'Fictional plan',prescription:'Sample prescription instructions',lab:'Sample investigation',followUp:'Review demonstration',complete:false}
test('consultation drafts keep the encounter identity and do not emit lab or pharmacy requests',()=>{
  const before=initialOperations(),after=saveConsultation(before,draft,visit,'Doctor')
  assert.equal(before.consultations.length,0);assert.equal(after.consultations[0].visitId,visit.encounterId)
  assert.equal(after.labs.length,0);assert.equal(after.prescriptions.length,0)
})
test('completion creates linked requests once and does not mutate fixtures',()=>{
  const state=saveConsultation(initialOperations(),{...draft,complete:true},visit,'Doctor')
  assert.equal(state.labs[0].patientId,visit.patientId);assert.equal(state.prescriptions[0].visitId,visit.encounterId)
  assert.throws(()=>saveConsultation(state,{...draft,complete:true},visit,'Doctor'),/already complete/)
})
test('clinical save checks role, visit identity, stage and required completion fields',()=>{
  assert.throws(()=>saveConsultation(initialOperations(),draft,visit,'Reception'),/authorised/)
  assert.throws(()=>saveConsultation(initialOperations(),{...draft,visitId:'OTHER'},visit,'Doctor'),/authorised/)
  assert.throws(()=>saveConsultation(initialOperations(),draft,{...visit,stage:'Waiting'},'Doctor'),/authorised/)
  assert.throws(()=>saveConsultation(initialOperations(),{...draft,complete:true,plan:''},visit,'Doctor'),/plan/)
  assert.equal(canUseClinical('Doctor','laboratory'),false);assert.equal(canUseClinical('Pharmacy','pharmacy'),true)
})
test('decimal money converts to exact integer minor units and rejects invalid or excessive precision',()=>{
  assert.equal(moneyMinor('0.10'),10);assert.equal(moneyMinor('1000.01'),100001);assert.equal(moneyMinor('25.5'),2550)
  for(const invalid of ['','0','-1','1e4','NaN','1.001','0.001','10000000000'])assert.equal(moneyMinor(invalid),null)
})
test('simulated payments accumulate exactly and reject overpayment without changing the invoice',()=>{
  const original:Invoice={id:'DEMO',patientId:visit.patientId,date:visit.date,description:'Sample',amount:30,paid:0}
  const first=recordPayment(original,10),paid=recordPayment(first,20)
  assert.equal(original.paid,0);assert.equal(paid.paid,30)
  assert.throws(()=>recordPayment(paid,1),/balance/);assert.throws(()=>recordPayment(original,0.5),/positive/)
})
test('reset factory creates independent synthetic state',()=>{const a=initialOperations(),b=initialOperations();a.departments.push('Sample');assert.equal(b.departments.includes('Sample'),false)})
