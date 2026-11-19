import { useState } from 'react'
import { initialAppointments, initialPatients, initialQueue } from '../mockData'
import { initialOperations } from './operations'

/** All demo data belongs to this in-memory repository. No browser storage or API fallback. */
export function useDemoRepository() {
  const [patients,setPatients]=useState(()=>initialPatients.map(p=>({...p})))
  const [appointments,setAppointments]=useState(()=>initialAppointments.map(a=>({...a})))
  const [queue,setQueue]=useState(()=>initialQueue.map(q=>({...q})))
  const [operations,setOperations]=useState(initialOperations)
  function reset(){setPatients(initialPatients.map(p=>({...p})));setAppointments(initialAppointments.map(a=>({...a})));setQueue(initialQueue.map(q=>({...q})));setOperations(initialOperations())}
  return {patients,setPatients,appointments,setAppointments,queue,setQueue,operations,setOperations,reset}
}
