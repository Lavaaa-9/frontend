import { useCallback } from 'react'
import { api } from '../api'
import { listAppointments, listQueue } from '../api/scheduling'
import { DataTable, EmptyState, PageHeader, ResourceState, Status } from '../components/ui'
import { useResource } from '../hooks'

function clinicTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-TZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Dar_es_Salaam' }).format(date)
    : 'Unavailable'
}

export function Appointments({ security }: { security: () => void }) {
  const list = useResource(useCallback(signal => listAppointments(api, '', signal), []))
  return <><PageHeader title="Appointments" eyebrow="SCHEDULING" description="Appointments returned by the connected service."/>
    <p className="notice">Booking, changes and check-in are not yet available in this interface.</p>
    <ResourceState {...list} security={security}><section className="surface-card core-card">
      {list.data?.items.length ? <><DataTable caption="Appointments" rows={list.data.items} rowKey={row=>row.id} columns={[
        {id:'time',label:'Scheduled (Tanzania)',render:row=>clinicTime(row.scheduled_start)},
        {id:'patient',label:'Patient ID',render:row=>row.patient_id},
        {id:'type',label:'Type',render:row=>row.appointment_type},
        {id:'status',label:'Status',render:row=><Status value={row.status}/>},
      ]}/>{list.data.next_cursor&&<p className="notice">Only the first 25 appointments are shown. Additional pages are unavailable until server pagination is corrected.</p>}</> : <EmptyState title="No appointments returned" description="There are no appointments in this page."/>}
    </section></ResourceState></>
}

export function Queue({ security }: { security: () => void }) {
  const list = useResource(useCallback(signal => listQueue(api, signal), []))
  return <><PageHeader title="Patient queue" eyebrow="RECEPTION" description="Active queue tickets returned by the connected service."/>
    <p className="notice">Queue check-in and status changes are not yet available in this interface.</p>
    <ResourceState {...list} security={security}><section className="surface-card core-card">
      {list.data?.items.length ? <DataTable caption="Active queue" rows={list.data.items} rowKey={row=>row.id} columns={[
        {id:'ticket',label:'Ticket',render:row=>row.ticket_no},
        {id:'patient',label:'Patient ID',render:row=>row.patient_id},
        {id:'encounter',label:'Visit ID',render:row=>row.encounter_id},
        {id:'priority',label:'Priority',render:row=>row.priority},
        {id:'status',label:'Status',render:row=><Status value={row.status}/>},
      ]}/> : <EmptyState title="No active queue tickets" description="Active tickets returned by the service appear here."/>}
      <button className="button outline" onClick={list.retry}>Refresh queue</button>
    </section></ResourceState></>
}
