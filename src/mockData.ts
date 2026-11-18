import { clinicDate } from './workflows.js'
/** Fictional UI fixtures only. Do not use real patient records in development. */
const demoDate = clinicDate()
export type Role = 'Administrator' | 'Reception' | 'Nurse' | 'Doctor' | 'Laboratory' | 'Cashier'
export type PatientStatus = 'Active' | 'Follow-up' | 'New'
export interface Patient {
  id: string
  name: string
  sex: 'Female' | 'Male'
  age: number
  lastVisit: string
  status: PatientStatus
  initials: string
  avatar: string
}
export interface Appointment {
  id: string
  patientId: string
  patientName: string
  reason: string
  provider: string
  time: string
  date: string
  status: 'Confirmed' | 'Waiting' | 'Completed' | 'Cancelled'
}
export interface QueueEntry {
  id: string
  encounterId: string
  appointmentId?: string
  date: string
  patientId: string
  patientName: string
  service: string
  time: string
  stage: 'Waiting' | 'Triage' | 'Consultation' | 'Completed'
}
export const initialPatients: Patient[] = [
  { id: 'SP-00021', name: 'Amina M.', sex: 'Female', age: 32, lastVisit: 'Today', status: 'Active', initials: 'AM', avatar: 'mint' },
  { id: 'SP-00022', name: 'Joseph K.', sex: 'Male', age: 45, lastVisit: 'Today', status: 'Follow-up', initials: 'JK', avatar: 'lavender' },
  { id: 'SP-00023', name: 'Neema B.', sex: 'Female', age: 28, lastVisit: 'Today', status: 'New', initials: 'NB', avatar: 'peach' },
  { id: 'SP-00024', name: 'David M.', sex: 'Male', age: 56, lastVisit: 'Yesterday', status: 'Active', initials: 'DM', avatar: 'blue' },
  { id: 'SP-00025', name: 'Rehema S.', sex: 'Female', age: 39, lastVisit: 'Yesterday', status: 'Follow-up', initials: 'RS', avatar: 'mint' },
  { id: 'SP-00026', name: 'Peter J.', sex: 'Male', age: 24, lastVisit: '2 days ago', status: 'Active', initials: 'PJ', avatar: 'lavender' },
]
export const initialAppointments: Appointment[] = [
  { id: 'AP-1001', date:demoDate, patientId:'SP-00021', patientName: 'Amina M.', reason: 'General consultation', provider: 'Dr. M. N.', time: '09:00', status: 'Waiting' },
  { id: 'AP-1002', date:demoDate, patientId:'SP-00022', patientName: 'Joseph K.', reason: 'Follow-up review', provider: 'Dr. M. N.', time: '09:30', status: 'Waiting' },
  { id: 'AP-1003', date:demoDate, patientId:'SP-00023', patientName: 'Neema B.', reason: 'Health screening', provider: 'Dr. S. K.', time: '10:15', status: 'Waiting' },
  { id: 'AP-1004', date:demoDate, patientId:'SP-00025', patientName: 'Rehema S.', reason: 'Review visit', provider: 'Dr. S. K.', time: '11:00', status: 'Completed' },
  { id: 'AP-1005', date:demoDate, patientId:'SP-00026', patientName: 'Peter J.', reason: 'General consultation', provider: 'To be assigned', time: '11:30', status: 'Confirmed' },
]
export const initialQueue: QueueEntry[] = [
  { id: 'Q-01', encounterId:'VIS-1001', appointmentId:'AP-1001', date:demoDate, patientId:'SP-00021', patientName: 'Amina M.', service: 'General care', time: '08:45', stage: 'Consultation' },
  { id: 'Q-02', encounterId:'VIS-1002', appointmentId:'AP-1002', date:demoDate, patientId:'SP-00022', patientName: 'Joseph K.', service: 'Review', time: '09:10', stage: 'Triage' },
  { id: 'Q-03', encounterId:'VIS-1003', appointmentId:'AP-1003', date:demoDate, patientId:'SP-00023', patientName: 'Neema B.', service: 'Screening', time: '09:20', stage: 'Waiting' },
  { id: 'Q-04', encounterId:'VIS-1004', appointmentId:'AP-1004', date:demoDate, patientId:'SP-00025', patientName: 'Rehema S.', service: 'Follow-up', time: '08:15', stage: 'Completed' },
]
