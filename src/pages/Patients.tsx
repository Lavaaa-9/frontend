import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { api } from '../api'
import { ApiError } from '../api/client'
import { birthLabel, can, clinicDate, patientName } from '../api/types'
import type { Actor, Facility, Page, Patient } from '../api/types'
import { DataTable, EmptyState, ErrorNotice, FormField, Modal, PageHeader, ResourceState } from '../components/ui'
import { useResource } from '../hooks'
import { demographics, RegistrationKey, validateDemographics } from '../validation'

export function Patients({actor,security}:{actor:Actor;security:()=>void}) {
  const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[cursor,setCursor]=useState('')
  const [registration,setRegistration]=useState(false),[selected,setSelected]=useState(''),[notice,setNotice]=useState('')
  const registrationKey=useRef(new RegistrationKey())
  useEffect(()=>{const timer=setTimeout(()=>{setQuery(search.trim());setCursor('')},300);return()=>clearTimeout(timer)},[search])
  const list=useResource(useCallback(signal=>api.request<Page<Patient>>(`/staff/patients?${new URLSearchParams({q:query,cursor,limit:'25'})}`,{signal}),[query,cursor]))
  function saved(patient:Patient){setRegistration(false);setNotice('Patient saved.');setSelected(patient.id);list.retry()}
  return <><PageHeader title="Patients" eyebrow="PATIENT DIRECTORY" description="Search authorised patient records and maintain registration details." action={can(actor,'patients.write')&&<button className="button primary" onClick={()=>setRegistration(true)}><Plus size={17}/>Register patient</button>}/>
    {notice&&<p className="notice success" role="status">{notice}</p>}
    <section className="surface-card core-card"><div className="listing-heading"><div><h2>Patient directory</h2><p>Search by name, phone or medical record number.</p></div><div className="search-input"><Search size={18}/><label className="sr-only" htmlFor="patient-search">Search patients</label><input id="patient-search" value={search} onChange={event=>setSearch(event.target.value)} maxLength={100} placeholder="Name, phone or MRN" autoComplete="off"/></div></div>
      <ResourceState {...list} security={security}>{list.data?.items.length?<><DataTable caption="Patients" rows={list.data.items} rowKey={row=>row.id} columns={[
        {id:'name',label:'Patient',render:row=><strong>{patientName(row)}</strong>},{id:'mrn',label:'Medical record number',render:row=><span className="mono">{row.mrn}</span>},
        {id:'birth',label:'Birth details',render:birthLabel},{id:'phone',label:'Phone',render:row=>row.phone||'Not recorded'},
        {id:'open',label:'Profile',render:row=><button className="table-action" aria-label={`Open ${patientName(row)}`} onClick={()=>setSelected(row.id)}>Open profile</button>},
      ]}/><div className="table-footer"><span>Showing {list.data.items.length} records. Access is limited by your assignment.</span><div className="page-actions">{cursor&&<button className="button outline" onClick={()=>setCursor('')}>First page</button>}{list.data.next_cursor&&<button className="button outline" onClick={()=>setCursor(list.data!.next_cursor)}>Next page</button>}</div></div></>:<EmptyState title={query?'No matching patients':'No patients returned'} description={query?'Check the spelling or try the medical record number.':'Records appear here when your account is permitted to view them.'}/>}</ResourceState>
    </section>
    {registration&&<PatientForm actor={actor} close={()=>setRegistration(false)} saved={saved} registrationKey={registrationKey.current}/>}
    {selected&&<PatientProfile id={selected} actor={actor} close={()=>setSelected('')} changed={()=>{setNotice('Patient updated.');list.retry()}} security={security}/>}
  </>
}

function PatientProfile({id,actor,close,changed,security}:{id:string;actor:Actor;close:()=>void;changed:()=>void;security:()=>void}) {
  const patient=useResource(useCallback(signal=>api.request<Patient>(`/staff/patients/${encodeURIComponent(id)}`,{signal}),[id]))
  const [editing,setEditing]=useState(false)
  if(editing&&patient.data)return <PatientForm actor={actor} patient={patient.data} close={()=>setEditing(false)} saved={()=>{setEditing(false);patient.retry();changed()}} registrationKey={new RegistrationKey()}/>
  return <Modal title="Patient profile" subtitle="Patient registration details" close={close}><div className="modal-form"><ResourceState {...patient} security={()=>{close();security()}}>{patient.data&&<>
    <div><h3>{patientName(patient.data)}</h3><p className="mono">{patient.data.mrn}</p></div><dl className="details"><dt>Birth details</dt><dd>{birthLabel(patient.data)}</dd><dt>Phone</dt><dd>{patient.data.phone||'Not recorded'}</dd><dt>Address</dt><dd>{patient.data.address||'Not recorded'}</dd><dt>Facility ID</dt><dd>{patient.data.facility_id}</dd></dl>
    <div className="unavailable-note"><h3>Additional patient information</h3><p>Next of kin, medical history and patient documents are unavailable until their backend contracts are supplied.</p></div>
    {can(actor,'patients.write')&&<button className="button primary" onClick={()=>setEditing(true)}>Edit registration details</button>}
  </>}</ResourceState></div></Modal>
}

function PatientForm({actor,patient,close,saved,registrationKey}:{actor:Actor;patient?:Patient;close:()=>void;saved:(patient:Patient)=>void;registrationKey:RegistrationKey}) {
  const facilities=useResource(useCallback(signal=>api.request<{items:Facility[]}>('/staff/facilities',{signal}),[]))
  const [precision,setPrecision]=useState(patient?.birth_precision||'unknown'),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
  const [matches,setMatches]=useState<Page<Patient>|null>(null),[reviewed,setReviewed]=useState(''),[checking,setChecking]=useState(false)
  const formRef=useRef<HTMLFormElement>(null)
  const title=patient?'Edit registration details':'Register patient'
  async function checkMatches() {
    const form=formRef.current!; const value=demographics(form)
    if(!value.family_name){setError(new Error('Enter the family name before checking possible matches.'));return}
    setChecking(true);setError(null);setMatches(null);setReviewed('')
    try {const result=await api.request<Page<Patient>>(`/staff/patients?${new URLSearchParams({q:value.family_name,limit:'25'})}`);setMatches(result);setReviewed(value.family_name)}
    catch(reason){setError(reason)}finally{setChecking(false)}
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const value=demographics(event.currentTarget),invalid=validateDemographics(value,clinicDate())
    if(invalid){setError(new Error(invalid));return}
    if(!patient && reviewed!==value.family_name){setError(new Error('Review possible matches for this family name before registering.'));return}
    setBusy(true);setError(null)
    try {
      const body=patient?{...value,version:patient.version}:{...value,facility_id:String(new FormData(event.currentTarget).get('facility_id'))}
      const result=await api.request<Patient>(patient?`/staff/patients/${encodeURIComponent(patient.id)}`:'/staff/patients',{
        method:patient?'PUT':'POST',body,...(!patient?{headers:{'Idempotency-Key':registrationKey.forPayload(body)}}:{}),
      }); saved(result)
    }catch(reason){setError(reason)}finally{setBusy(false)}
  }
  const allowedFacilities=facilities.data?.items.filter(f=>f.active&&actor.facility_ids.includes(f.id))||[]
  return <Modal title={title} subtitle={patient?'Update demographics. The server checks the record version.':'The medical record number is assigned by the server.'} close={()=>{if(!busy&&!checking)close()}}>
    <form ref={formRef} className="modal-form" onSubmit={submit} aria-busy={busy}><ErrorNotice error={error}/>
      {error instanceof ApiError&&error.status===409&&patient&&<p className="notice">This record changed elsewhere. Your entries remain here. Close and reopen the profile to review the latest version before editing again.</p>}
      <div className="field-row"><FormField id="given-name" label="Given name"><input data-initial-focus id="given-name" name="given_name" defaultValue={patient?.given_name} required maxLength={100} autoComplete="off"/></FormField>
      <FormField id="family-name" label="Family name"><input id="family-name" name="family_name" defaultValue={patient?.family_name} required maxLength={100} autoComplete="off" onChange={()=>{setReviewed('');setMatches(null)}}/></FormField></div>
      <FormField id="birth-precision" label="Birth date information"><select id="birth-precision" name="birth_precision" value={precision} onChange={event=>setPrecision(event.target.value as typeof precision)}><option value="unknown">Not known</option><option value="exact">Full date known</option><option value="year">Year only known</option></select></FormField>
      {precision==='exact'&&<FormField id="birth-date" label="Date of birth"><input id="birth-date" name="birth_date" type="date" min="1900-01-01" max={clinicDate()} defaultValue={patient?.birth_date||''} required/></FormField>}
      {precision==='year'&&<FormField id="birth-year" label="Year of birth" hint="No day or month will be invented."><input id="birth-year" name="birth_year" type="number" min={1900} max={new Date().getFullYear()} defaultValue={patient?.birth_year||''} required aria-describedby="birth-year-hint"/></FormField>}
      <FormField id="patient-phone" label="Phone (optional)"><input id="patient-phone" name="phone" type="tel" defaultValue={patient?.phone} maxLength={30} autoComplete="off"/></FormField>
      <FormField id="patient-address" label="Address (optional)"><input id="patient-address" name="address" defaultValue={patient?.address} maxLength={500} autoComplete="off"/></FormField>
      {!patient&&<><ResourceState {...facilities}>{allowedFacilities.length?<FormField id="patient-facility" label="Facility"><select id="patient-facility" name="facility_id" required>{allowedFacilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></FormField>:<p role="alert">No active facility is assigned to your account. Contact your administrator.</p>}</ResourceState>
        <section className="unavailable-note"><h3>Review possible duplicates</h3><p>Search existing records before registering. Similar names or shared phones do not establish identity.</p><button className="button outline" type="button" disabled={busy||checking} onClick={checkMatches}>{checking?'Checking…':'Check possible matches'}</button>
          {matches&&<><p role="status">{matches.items.length} possible matches returned{matches.next_cursor?' (more results exist)':''}.</p>{matches.items.length>0&&<ul>{matches.items.map(match=><li key={match.id}>{patientName(match)} · {match.mrn} · {birthLabel(match)}</li>)}</ul>}<p>This limited search only covers records you may access. Verify identity before continuing; records are never merged automatically.</p></>}
        </section></>}
      <div className="form-actions"><button className="button outline" type="button" disabled={busy||checking} onClick={close}>Cancel</button><button className="button primary" disabled={busy||checking||(!patient&&(!reviewed||!allowedFacilities.length))}>{busy?'Saving…':patient?'Save changes':'Register patient'}</button></div>
    </form></Modal>
}
