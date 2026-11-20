import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../api'
import { ApiError } from '../api/client'
import { can } from '../api/types'
import type { Actor, AuditEvent, Facility, Page, StaffUser } from '../api/types'
import { DataTable, EmptyState, ErrorNotice, FormField, Modal, PageHeader, ResourceState, Status } from '../components/ui'
import { useResource } from '../hooks'

export function Facilities({actor,security}:{actor:Actor;security:()=>void}) {
  const list=useResource(useCallback(signal=>api.request<{items:Facility[]}>('/staff/facilities',{signal}),[]))
  const [adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[notice,setNotice]=useState('')
  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null)
    try {await api.request('/staff/facilities',{method:'POST',body:{name:String(data.get('name')).trim(),timezone:String(data.get('timezone')).trim()}});setAdding(false);setNotice('Facility created.');list.retry()}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  return <><PageHeader title="Facilities" eyebrow="ADMINISTRATION" description="Facility names and operating time zones." action={can(actor,'facilities.manage')&&<button className="button primary" onClick={()=>{setError(null);setAdding(true)}}><Plus size={17}/>Add facility</button>}/>
    {notice&&<p className="notice success" role="status">{notice}</p>}<ResourceState {...list} security={security}><section className="surface-card core-card">{list.data?.items.length?<DataTable caption="Facilities" rows={list.data.items} rowKey={row=>row.id} columns={[
      {id:'name',label:'Facility',render:row=><strong>{row.name}</strong>},{id:'zone',label:'Time zone',render:row=>row.timezone},{id:'active',label:'Status',render:row=><Status value={row.active?'Active':'Inactive'}/>},
    ]}/>:<EmptyState title="No facilities returned" description="An authorised administrator can add facilities."/>}<p className="field-hint">Department setup and facility updates are unavailable in the current API.</p></section></ResourceState>
    {adding&&<Modal title="Add facility" subtitle="Create a facility on the connected server." close={()=>{if(!busy)setAdding(false)}}><form className="modal-form" onSubmit={create}><ErrorNotice error={error}/><FormField id="facility-name" label="Facility name"><input data-initial-focus id="facility-name" name="name" required maxLength={200}/></FormField><FormField id="facility-zone" label="Time zone" hint="Use an IANA time zone, for example Africa/Dar_es_Salaam."><input id="facility-zone" name="timezone" defaultValue="Africa/Dar_es_Salaam" required maxLength={100} aria-describedby="facility-zone-hint"/></FormField><div className="form-actions"><button type="button" className="button outline" disabled={busy} onClick={()=>setAdding(false)}>Cancel</button><button className="button primary" disabled={busy}>{busy?'Creating…':'Create facility'}</button></div></form></Modal>}
  </>
}
const roles=['receptionist','nurse','doctor','lab_technician','lab_supervisor','pharmacist','cashier','billing_supervisor','manager','compliance_officer']
export function Staff({actor,security,signedOut}:{actor:Actor;security:()=>void;signedOut:(message:string)=>void}) {
  const [cursor,setCursor]=useState(''),[editing,setEditing]=useState<StaffUser|null|undefined>(undefined),[notice,setNotice]=useState('')
  const list=useResource(useCallback(signal=>api.request<Page<StaffUser>>(`/staff/users?${new URLSearchParams({cursor,limit:'25'})}`,{signal}),[cursor]))
  return <><PageHeader title="Staff accounts" eyebrow="ACCESS MANAGEMENT" description="Manage account assignments and active status." action={can(actor,'staff.manage')&&<button className="button primary" onClick={()=>setEditing(null)}><Plus size={17}/>Add staff account</button>}/>
    {notice&&<p className="notice success" role="status">{notice}</p>}<ResourceState {...list} security={security}><section className="surface-card core-card">{list.data?.items.length?<><DataTable caption="Staff accounts" rows={list.data.items} rowKey={row=>row.id} columns={[
      {id:'name',label:'Staff member',render:row=><strong>{row.display_name}</strong>},{id:'email',label:'Email',render:row=>row.email},{id:'role',label:'Role',render:row=>row.role},
      {id:'status',label:'Account',render:row=><Status value={row.active?'Active':'Inactive'}/>},{id:'action',label:'Action',render:row=>can(actor,'staff.manage')&&<button className="table-action" aria-label={`Edit ${row.display_name}`} onClick={()=>setEditing(row)}>Edit account</button>},
    ]}/><div className="table-footer"><span>Assignments and status changes end the affected user’s sessions.</span><div className="page-actions">{cursor&&<button className="button outline" onClick={()=>setCursor('')}>First page</button>}{list.data.next_cursor&&<button className="button outline" onClick={()=>setCursor(list.data!.next_cursor)}>Next page</button>}</div></div></>:<EmptyState title="No staff accounts returned" description="Refresh to check access to staff accounts."/>}</section></ResourceState>
    {editing!==undefined&&<StaffForm user={editing} close={()=>setEditing(undefined)} saved={()=>{setEditing(undefined);if(editing?.id===actor.id){signedOut('Your account changed. Sign in again to reload your permissions.');return}setNotice(editing?'Staff account updated.':'Staff account created.');list.retry()}}/>}
  </>
}
function StaffForm({user,close,saved}:{user:StaffUser|null;close:()=>void;saved:()=>void}) {
  const facilities=useResource(useCallback(signal=>api.request<{items:Facility[]}>('/staff/facilities',{signal}),[]))
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null)
    const shared={display_name:String(data.get('display_name')).trim(),role:String(data.get('role')),facility_ids:data.getAll('facility_ids').map(String)}
    try {await api.request(user?`/staff/users/${encodeURIComponent(user.id)}`:'/staff/users',{method:user?'PUT':'POST',body:user?{...shared,active:data.get('active')==='on',version:user.version}:{...shared,email:String(data.get('email')).trim(),password:String(data.get('password'))}});saved()}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  return <Modal title={user?'Edit staff account':'Add staff account'} subtitle="Only approved assignments should be granted." close={()=>{if(!busy)close()}}><form className="modal-form" onSubmit={submit}><ErrorNotice error={error}/>
    {error instanceof ApiError&&error.status===409&&<p className="notice">The account changed elsewhere. Close and reopen it to review the current version.</p>}
    <FormField id="staff-name" label="Display name"><input data-initial-focus id="staff-name" name="display_name" defaultValue={user?.display_name} required maxLength={200}/></FormField>
    <FormField id="staff-email" label="Email"><input id="staff-email" name="email" type="email" autoComplete="off" defaultValue={user?.email} disabled={!!user} required maxLength={254}/></FormField>
    {!user&&<FormField id="staff-password" label="Initial password" hint="Share through the clinic’s approved channel."><input id="staff-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required aria-describedby="staff-password-hint"/></FormField>}
    <FormField id="staff-role" label="Role"><select id="staff-role" name="role" defaultValue={user?.role||'receptionist'}>{user?.role==='administrator'&&<option value="administrator">administrator</option>}{roles.map(role=><option key={role} value={role}>{role}</option>)}</select></FormField>
    <p className="field-hint">Granting administrator access requires the backend’s independent approval process; it cannot be granted from this form.</p>
    <ResourceState {...facilities}><fieldset className="facility-checks"><legend>Facility assignments</legend>{facilities.data?.items.map(f=><label key={f.id}><input type="checkbox" name="facility_ids" value={f.id} defaultChecked={user?.facility_ids.includes(f.id)}/>{f.name}{!f.active?' (inactive)':''}</label>)}</fieldset></ResourceState>
    {user&&<label className="check-label"><input type="checkbox" name="active" defaultChecked={user.active}/>Account active</label>}
    <p className="field-hint">Saving an existing account revokes its active sessions. The server validates role and facility assignments.</p>
    <div className="form-actions"><button type="button" className="button outline" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy||facilities.loading||!!facilities.error}>{busy?'Saving…':user?'Save account':'Create account'}</button></div>
  </form></Modal>
}
export function Audit({security}:{security:()=>void}) {
  const [before,setBefore]=useState('')
  const list=useResource(useCallback(signal=>api.request<{items:AuditEvent[]}>(`/staff/audit${before?`?before=${encodeURIComponent(before)}`:''}`,{signal}),[before]))
  return <><PageHeader title="Audit log" eyebrow="ACCOUNTABILITY" description="Actions recorded by the connected backend. This view is read-only."/>
    <ResourceState {...list} security={security}><section className="surface-card core-card">{list.data?.items.length?<><DataTable caption="Audit events" rows={list.data.items} rowKey={row=>String(row.id)} columns={[
      {id:'time',label:'Time',render:row=>new Date(row.created_at).toLocaleString()},{id:'action',label:'Action',render:row=><strong>{row.action}</strong>},{id:'outcome',label:'Outcome',render:row=><Status value={row.outcome}/>},
      {id:'actor',label:'Actor ID',render:row=>row.actor_id||'System'},{id:'resource',label:'Resource ID',render:row=>row.resource_id||'—'},{id:'request',label:'Request ID',render:row=>row.request_id},
    ]}/><div className="table-footer"><span>Access to this log is recorded by the backend.</span><div className="page-actions">{before&&<button className="button outline" onClick={()=>setBefore('')}>Newest events</button>}<button className="button outline" onClick={()=>setBefore(String(list.data!.items.at(-1)!.id))}>Older events</button></div></div></>:<EmptyState title="No audit events returned" description="There are no events in this page of the log." action={before&&<button className="button outline" onClick={()=>setBefore('')}>Newest events</button>}/>}</section></ResourceState>
  </>
}
