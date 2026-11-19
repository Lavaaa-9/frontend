import type { QueueEntry, Role } from '../mockData.js'

export interface Triage {visitId:string;temperature:string;pulse:string;pressure:string;notes:string;complete:boolean}
export interface Consultation {visitId:string;symptoms:string;diagnosis:string;icd:string;plan:string;prescription:string;lab:string;followUp:string;complete:boolean}
export interface LabRequest {id:string;visitId:string;patientId:string;test:string;result:string;status:'Pending'|'Completed'}
export interface Prescription {id:string;visitId:string;patientId:string;instructions:string;status:'Pending'|'Dispensed'}
export interface Invoice {id:string;patientId:string;description:string;amount:number;paid:number;date:string}
export interface DemoStaff {id:string;name:string;email:string;role:Role;active:boolean;department:string}
export interface DemoEvent {id:string;time:string;action:string;resource:string;actor:Role}
export interface DemoDocument {id:string;patientId:string;name:string;text:string}
export interface Operations {
  triage:Triage[];consultations:Consultation[];labs:LabRequest[];prescriptions:Prescription[];invoices:Invoice[]
  staff:DemoStaff[];departments:string[];events:DemoEvent[];facility:string;documents:DemoDocument[]
}
export function initialOperations():Operations {
  return {triage:[],consultations:[],labs:[],prescriptions:[],invoices:[],staff:[{id:'DEMO-STAFF-1',name:'Sample Receptionist',email:'reception@example.invalid',role:'Reception',active:true,department:'Reception'}],departments:['Reception','Nursing','Consultation','Laboratory','Pharmacy'],events:[],facility:'Spartial Specialized Polyclinic',documents:[]}
}
export function moneyMinor(value:string):number|null {
  if(!/^\d{1,9}(\.\d{1,2})?$/.test(value))return null
  const [whole,fraction='']=value.split('.')
  const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'))
  return Number.isSafeInteger(amount)&&amount>0?amount:null
}
export const amountLabel=(minor:number)=>new Intl.NumberFormat('en-TZ',{style:'currency',currency:'TZS',minimumFractionDigits:2}).format(minor/100)
export function canUseClinical(role:Role,kind:'triage'|'consultation'|'laboratory'|'pharmacy') {
  return role==='Administrator'||(kind==='triage'?role==='Nurse':kind==='consultation'?role==='Doctor':kind==='laboratory'?role==='Laboratory':role==='Pharmacy')
}
export function saveConsultation(state:Operations,record:Consultation,visit:QueueEntry,role:Role):Operations {
  if(!canUseClinical(role,'consultation')||visit.stage!=='Consultation'||record.visitId!==visit.encounterId)throw new Error('Select a visit in consultation with an authorised demo role.')
  const existing=state.consultations.find(r=>r.visitId===record.visitId)
  if(existing?.complete)throw new Error('This demonstration consultation is already complete.')
  if(record.complete&&(!record.symptoms.trim()||!record.plan.trim()))throw new Error('Enter observations and a treatment plan before completing the demonstration.')
  const labs=record.complete&&record.lab.trim()&&!state.labs.some(r=>r.visitId===record.visitId)?[...state.labs,{id:`DEMO-LAB-${record.visitId}`,visitId:record.visitId,patientId:visit.patientId,test:record.lab.trim(),result:'',status:'Pending' as const}]:state.labs
  const prescriptions=record.complete&&record.prescription.trim()&&!state.prescriptions.some(r=>r.visitId===record.visitId)?[...state.prescriptions,{id:`DEMO-RX-${record.visitId}`,visitId:record.visitId,patientId:visit.patientId,instructions:record.prescription.trim(),status:'Pending' as const}]:state.prescriptions
  return {...state,consultations:[...state.consultations.filter(r=>r.visitId!==record.visitId),record],labs,prescriptions}
}
export function recordPayment(invoice:Invoice,amount:number):Invoice {
  if(!Number.isSafeInteger(amount)||amount<=0||amount>invoice.amount-invoice.paid)throw new Error('Payment must be positive and cannot exceed the outstanding balance.')
  return {...invoice,paid:invoice.paid+amount}
}
