import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  ChevronDown, ClipboardList, Clock3, CreditCard,
  FileText, FlaskConical, HeartPulse, LayoutDashboard, LogOut, Menu,
  Video, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, Stethoscope, Users, UserRoundPlus, X, Pill, ListChecks,
  Info, ChevronRight, CircleCheck
} from 'lucide-react'
import type { Appointment, Patient, QueueEntry, Role } from './mockData'
import { BlankState, ConfirmDialog, DataTable, Dialog, PreviewNotice, ScreenState, StatePreviewControl, Status } from './components/ui'
import type { PreviewState } from './components/ui'
import { AppointmentForm, PatientForm, WalkInForm } from './components/WorkflowForms'
import type { AppointmentDraft } from './components/WorkflowForms'
import { activeVisit, cancelAppointment, canAdvance, canBook, canRegister, clinicDate, createWalkInVisit, nextStage, staffRoles } from './workflows'
import type { WalkInDraft, WalkInErrors } from './workflows'
import { Login } from './pages/Auth'
import { useHashRoute } from './app/routing'
import { ApiWorkspace } from './app/ApiWorkspace'
import { useDemoRepository } from './demo/repository'
import { Clinical, Requests } from './features/Clinical'
import type { ChangeOperations } from './features/Clinical'
import { Administration, Billing, Reports } from './features/Operations'
import { DemoAccount } from './features/Account'
import { PatientCard } from './features/PatientCard'
import { Telemedicine } from './features/Telemedicine'
import { amountLabel } from './demo/operations'
import { TerminalLanding } from './features/TerminalLanding'

type Screen = 'dashboard' | 'patients' | 'appointments' | 'queue' | 'triage' |
  'consultations' | 'laboratory' | 'pharmacy' | 'billing' | 'telemedicine' |
  'reports' | 'team' | 'settings' | 'account'

type MenuItem = { id: Screen; title: string; icon: LucideIcon; roles: Role[] }
type MenuGroup = { title: string; items: MenuItem[] }
const EVERYONE = staffRoles
const roles: Role[] = EVERYONE
const menuGroups: MenuGroup[] = [
  { title: 'WORKSPACE', items: [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, roles: EVERYONE },
    { id: 'patients', title: 'Patients', icon: Users, roles: ['Administrator','Reception','Nurse','Doctor','Laboratory','Pharmacy'] },
    { id: 'appointments', title: 'Appointments', icon: CalendarDays, roles: ['Administrator','Reception','Doctor','Nurse'] },
    { id: 'queue', title: 'Patient Queue', icon: ListChecks, roles: ['Administrator','Reception','Nurse','Doctor'] },
  ] },
  { title: 'CLINICAL', items: [
    { id: 'triage', title: 'Nurse Triage', icon: Activity, roles: ['Administrator','Nurse','Doctor'] },
    { id: 'consultations', title: 'Consultations', icon: Stethoscope, roles: ['Administrator','Doctor'] },
    { id: 'laboratory', title: 'Laboratory', icon: FlaskConical, roles: ['Administrator','Doctor','Laboratory'] },
    { id: 'pharmacy', title: 'Pharmacy', icon: Pill, roles: ['Administrator','Doctor','Pharmacy'] },
  ] },
  { title: 'MANAGEMENT', items: [
    { id: 'billing', title: 'Billing', icon: CreditCard, roles: ['Administrator','Cashier','Reception'] },
    { id: 'telemedicine', title: 'Telemedicine', icon: Video, roles: ['Administrator','Doctor','Reception'] },
    { id: 'reports', title: 'Reports', icon: FileText, roles: ['Administrator','Cashier','Management'] },
    { id: 'team', title: 'Staff & Roles', icon: ShieldCheck, roles: ['Administrator'] },
    { id: 'settings', title: 'Settings', icon: Settings2, roles: ['Administrator'] },
    { id: 'account', title: 'My Account', icon: ShieldCheck, roles: EVERYONE },
  ] }
]

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand brand-official ${compact ? 'brand-compact' : ''}`}>
    <img className="brand-image" src="/spartial-logo.jpg" alt="Spartial Specialized Polyclinic" />
  </div>
}

function Avatar({ initials, color = 'mint', size = 'normal' }: { initials: string; color?: string; size?: 'normal'|'small'|'large' }) {
  return <span className={`avatar avatar-${color} avatar-${size}`} aria-hidden="true">{initials}</span>
}

function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>
}

function StatCard({ icon: Icon, label, value, helper, tone = 'teal' }: { icon: LucideIcon; label: string; value: string|number; helper: string; tone?: string }) {
  return <div className="stat-card">
    <div className="stat-top"><div className={`stat-icon stat-${tone}`}><Icon size={19} /></div><MoreHorizontal size={17} className="muted" /></div>
    <div className="stat-value">{value}</div><div className="stat-label">{label}</div>
    <div className="stat-helper">{helper}</div>
  </div>
}

function DemoApp() {
  const [previewActive, setPreviewActive] = useState(false)
  const [role, setRole] = useState<Role>('Reception')
  const [route, navigateRoute] = useHashRoute()
  const screen = route.section as Screen
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const {patients,setPatients,appointments,setAppointments,queue,setQueue,operations,setOperations,reset} = useDemoRepository()
  const [modal, setModal] = useState<'patient'|'appointment'|'walk-in'|null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [message, setMessage] = useState('')
  const [patientFilter, setPatientFilter] = useState('All patients')
  const [queueFilter, setQueueFilter] = useState('All stages')
  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [walkInPatientId, setWalkInPatientId] = useState('')
  const [previewState, setPreviewState] = useState<PreviewState>('ready')
  const [pendingCancel, setPendingCancel] = useState<Appointment | null>(null)
  const [pendingStage, setPendingStage] = useState<QueueEntry | null>(null)
  const [editingPatient,setEditingPatient]=useState<Patient|undefined>()
  const [rescheduling,setRescheduling]=useState<Appointment|undefined>()
  const [appointmentFilter,setAppointmentFilter]=useState('All')
  const [calendar,setCalendar]=useState(false)
  const [patientSort,setPatientSort]=useState('Name')
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const today = new Intl.DateTimeFormat('en-TZ', {timeZone:'Africa/Dar_es_Salaam', weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(new Date())
  const visibleItems = menuGroups.flatMap(g=>g.items).filter(item=>item.roles.includes(role))
  const allowedScreen = screen
  const known = menuGroups.flatMap(g=>g.items).some(item=>item.id===screen)
  const canView = !known || visibleItems.some(item=>item.id===screen)
  const pageName = menuGroups.flatMap(g=>g.items).find(item=>item.id===screen)?.title ?? 'Page not found'
  const filteredPatients = useMemo(()=>patients.filter(p=>{
    const matchesText = `${p.name} ${p.id} ${p.phone||''}`.toLowerCase().includes(search.trim().toLowerCase())
    return matchesText && (patientFilter === 'All patients' || p.status === patientFilter)
  }).sort((a,b)=>patientSort==='Name'?a.name.localeCompare(b.name):a.id.localeCompare(b.id)),[patients,search,patientFilter,patientSort])
  const displayedAppointments=appointments.filter(a=>appointmentFilter==='All'||a.status===appointmentFilter||(appointmentFilter==='Upcoming'&&a.date>=clinicDate()&&a.status==='Confirmed')).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const filteredQueue = queue.filter(q=>queueFilter === 'All stages' || q.stage === queueFilter)
  const waiting = queue.filter(q=>q.stage !== 'Completed').length
  const todaysAppointments = appointments.filter(a => a.date === clinicDate())
  const upcomingAppointments = appointments.filter(a => a.date >= clinicDate() && a.status === 'Confirmed').slice(0,4)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const update = () => { setMobile(query.matches); setSidebarOpen(false) }
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!previewActive || route.section==='terminals') return
    document.title = `${pageName} · Spartial UI prototype`
    document.querySelector<HTMLElement>('#main-content')?.focus()
  }, [screen, previewActive, pageName])
  useEffect(()=>{
    setSidebarOpen(false);setModal(null);setPendingCancel(null);setPendingStage(null);setPreviewState('ready')
    if(route.section==='patients'&&route.detail==='new'&&canRegister(role)){setEditingPatient(undefined);setModal('patient')}
  },[route.section,route.detail])
  useEffect(()=>{setSelectedPatient(route.section==='patients'&&route.detail?patients.find(p=>p.id===route.detail)||null:null)},[route.section,route.detail,patients])

  function navigate(to: Screen) { navigateRoute(to); setSidebarOpen(false); setSearch(''); setSelectedPatient(null); setPreviewState('ready') }
  function changeRole(next: Role) { setRole(next); navigate('dashboard'); setModal(null); setPendingCancel(null); setPendingStage(null); setMessage('Role preview changed — this is navigation only, not backend authorization.') }
  function notify(value: string) { setMessage(value) }
  const changeOperations:ChangeOperations=(update,action,resource)=>{setOperations(state=>{const next=update(state);return {...next,events:[{id:crypto.randomUUID(),time:new Date().toISOString(),action,resource,actor:role},...next.events]}});notify(`${action}. Changes are in memory only.`)}
  function log(action:string,resource:string){changeOperations(state=>state,action,resource)}
  function openPatient(patient:Patient){navigateRoute('patients',patient.id);setSelectedPatient(patient)}
  function openAppointment(patientId = '') { if (!canBook(role)) return; setRescheduling(undefined);setAppointmentPatientId(patientId); setModal('appointment') }
  function openWalkIn(patientId = '') { if (!canRegister(role)) return; setWalkInPatientId(patientId); setModal('walk-in') }
  function addWalkIn(draft: WalkInDraft): WalkInErrors | undefined {
    const result = createWalkInVisit(role, patients, queue, draft)
    if (result.errors) return result.errors
    const entry = result.entry
    setQueue(prev => [...prev, entry])
    setPatients(prev => prev.map(p => p.id === entry.patientId ? { ...p, lastVisit: 'Today' } : p))
    setModal(null); setQueueFilter('All stages'); navigate('queue')
    log('Demo walk-in checked in',entry.encounterId)
    notify(`Demo walk-in checked in with visit ${entry.encounterId}. No appointment was created; changes reset on refresh.`)
  }
  function addPatient(name: string, age: number, sex: Patient['sex'],details:Pick<Patient,'phone'|'address'|'nextOfKin'>) {
    if (!canRegister(role)) return
    if(editingPatient){const updated={...editingPatient,name,age,sex,...details,initials:name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase()};setPatients(prev=>prev.map(p=>p.id===updated.id?updated:p));setAppointments(prev=>prev.map(a=>a.patientId===updated.id?{...a,patientName:name}:a));setQueue(prev=>prev.map(q=>q.patientId===updated.id?{...q,patientName:name}:q));setModal(null);setEditingPatient(undefined);log('Demo patient updated',updated.id);return}
    const number = Math.max(30, ...patients.map(p=>Number(p.id.split('-')[1]) || 0)) + 1
    const record: Patient = { id:`SP-${String(number).padStart(5,'0')}`, name, sex, age, ...details,lastVisit:'Not yet visited', status:'New', initials:name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase(), avatar:'blue' }
    setPatients(prev=>[record,...prev]); setModal(null); setPatientFilter('All patients')
    log('Demo patient registered',record.id)
    navigate('patients'); notify(`Demo patient ${record.id} added in this browser session.`)
  }
  function addAppointment(draft: AppointmentDraft) {
    if (!canBook(role)) return
    const patient = patients.find(p=>p.id===draft.patientId)
    if (!patient) return
    if(rescheduling){setAppointments(prev=>prev.map(a=>a.id===rescheduling.id?{...a,...draft,patientName:patient.name}:a));setModal(null);setRescheduling(undefined);log('Demo appointment rescheduled',rescheduling.id);return}
    const appointment: Appointment = { id:`AP-${crypto.randomUUID().slice(0,8)}`, patientName:patient.name, ...draft, provider:draft.provider||'To be assigned', status:'Confirmed' }
    setAppointments(prev=>[...prev,appointment].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)))
    setModal(null)
    log('Demo appointment created',appointment.id)
    navigate('appointments'); notify('Demo appointment added for this browser session.')
  }
  function checkIn(appointment: Appointment) {
    if (!canRegister(role) || appointment.status !== 'Confirmed' || appointment.date !== clinicDate()) return
    if (activeVisit(queue, appointment.patientId, appointment.date)) { notify('This sample patient already has an active visit today. Review the queue before checking in again.'); return }
    const suffix = crypto.randomUUID().slice(0,8)
    setQueue(prev => [...prev, { id:`Q-${suffix}`, encounterId:`VIS-${suffix}`, appointmentId:appointment.id, date:appointment.date, patientId:appointment.patientId, patientName:appointment.patientName, service:appointment.reason, time:new Intl.DateTimeFormat('en-GB', {timeZone:'Africa/Dar_es_Salaam', hour:'2-digit', minute:'2-digit'}).format(new Date()), stage:'Waiting' }])
    setAppointments(prev => prev.map(a => a.id === appointment.id ? {...a, status:'Waiting'} : a))
    setPatients(prev => prev.map(p => p.id === appointment.patientId ? {...p, lastVisit:'Today'} : p))
    setQueueFilter('All stages'); navigate('queue'); notify('Demo check-in added to the queue with a synthetic visit ID.')
  }
  function queueStep(id: string) {
    const entry = queue.find(q => q.id === id)
    if (!entry || !canAdvance(role, entry.stage)) return
    const stage = nextStage(entry.stage)
    setQueue(prev=>prev.map(q=> q.id !== id ? q : {...q, stage}))
    if (stage === 'Completed') setAppointments(prev => prev.map(a => a.id === entry.appointmentId ? {...a, status:'Completed'} : a))
    setPendingStage(null)
    notify('Demo queue stage updated locally. No real clinical record was changed.')
  }

  function exitPreview() { setPreviewActive(false); setSidebarOpen(false); setModal(null); setSelectedPatient(null); setPendingCancel(null); setPendingStage(null); setMessage(''); navigateRoute('terminals'); document.title = 'Spartial · Healthcare Workspace' }

  if (route.section==='terminals') return <TerminalLanding onSelect={terminal=>{
    if(!terminal.screen)return
    setRole(terminal.role);setPreviewActive(false);navigateRoute(terminal.screen)
  }} onSignIn={()=>{setRole('Reception');setPreviewActive(false);navigateRoute('dashboard')}}/>

  if (!previewActive) return <Login initialRole={role} back={()=>navigateRoute('terminals')} onDemo={selected => {setRole(selected);setPreviewActive(true)}} />

  const navigation = <>
      <div className="sidebar-brand"><Brand/><button className="icon-button mobile-close" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)}><X size={20}/></button></div>
      <div className="workspace-caption"><span className="work-icon">S</span><div><b>Spartial Polyclinic</b><span>Staff workspace</span></div><ChevronDown size={15}/></div>
      <nav className="nav-area" aria-label="Main navigation">
        {menuGroups.map(group=>{
          const items=group.items.filter(item=>item.roles.includes(role))
          if (!items.length) return null
          return <div className="nav-group" key={group.title}><div className="nav-group-title">{group.title}</div>
            {items.map(item=>{const Icon = item.icon;return <button key={item.id} className={`nav-link ${allowedScreen===item.id?'nav-link-active':''}`} aria-current={allowedScreen===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon size={18} strokeWidth={1.9}/><span>{item.title}</span>{item.id==='queue'&&waiting>0?<span className="nav-count">{waiting}</span>:null}</button>})}
          </div>
        })}
      </nav>
      <div className="sidebar-footer"><div className="support-mini"><span className="support-icon"><Info size={20}/></span><div><b>Design preview only</b><span>Role menus are not access control</span></div></div>
        <div className="signed-in"><Avatar initials={role.slice(0,2).toUpperCase()} color="mint" size="small"/><div><strong>{role} preview</strong><span>UI design mode</span></div><button title="Exit preview" aria-label="Exit preview" className="exit-icon" onClick={exitPreview}><LogOut size={16}/></button></div>
      </div>
  </>
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to main content</a>
    {mobile ? sidebarOpen && <Dialog label="Staff navigation" className="sidebar navigation-dialog" close={()=>setSidebarOpen(false)}>{navigation}</Dialog> : <aside className="sidebar">{navigation}</aside>}
    <div className="workspace">
      <header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-haspopup="dialog" onClick={()=>setSidebarOpen(true)}><Menu size={21}/></button><div className="breadcrumbs"><span className="breadcrumb-root">Workspace</span><ChevronRight size={14}/> <span>{pageName}</span></div></div>
        <div className="topbar-actions"><button className="global-search" onClick={()=>navigate('patients')} aria-label="Go to patient search"><Search size={17}/><span>Search patients...</span><kbd>⌕</kbd></button>
          <button className="text-button" type="button" onClick={()=>navigateRoute('terminals')}>Terminals</button><span className="demo-pill"><span/>DEMO DATA</span>
          <label className="role-picker"><span>Viewing as</span><select aria-label="Preview staff role" value={role} onChange={e=>changeRole(e.target.value as Role)}>{roles.map(r=><option key={r}>{r}</option>)}</select></label>
          <button className="top-notifications" aria-label="About notifications" title="Notifications are not connected in this prototype" onClick={()=>notify('Notifications will be connected to the backend during implementation.')}><Bell size={19}/><span/></button>
          <Avatar initials="SP" color="peach" size="small" />
        </div></header>
      <main className="main-area" id="main-content" tabIndex={-1}>
        <PreviewNotice/>
        {canView && <StatePreviewControl value={previewState} change={setPreviewState}/>}
        <ScreenState state={canView ? previewState : 'denied'} reset={()=>{setPreviewState('ready');if(!canView)navigate('dashboard')}}>
        {allowedScreen==='dashboard' && <>
          <div className="main-heading"><div><div className="page-eyebrow">OVERVIEW <span className="eyebrow-line"/> {today}</div><h1>Good day, {role === 'Doctor' ? 'Doctor' : role === 'Administrator' ? 'Administrator' : role === 'Nurse' ? 'Nurse' : 'team'} <span className="wave" aria-hidden="true">✳</span></h1><p>Here's a calm overview of your clinic's activity in this interface preview.</p></div>{canBook(role) && <button className="button outline" onClick={()=>navigate('appointments')}><CalendarDays size={17}/> View appointments</button>}</div>
          <div className="hero"><div className="hero-pattern hero-pattern-one"/><div className="hero-pattern hero-pattern-two"/><div className="hero-content"><span className="hero-tag"><span/> HEALTHCARE, SIMPLIFIED</span><h2>Every patient.<br/><em>One connected journey.</em></h2><p>Explore the proposed staff workflow with sample records, connected teams and clear handoffs.</p><div className="hero-actions">{canRegister(role) && <button className="button hero-white" onClick={()=>navigateRoute('patients','new')}><UserRoundPlus size={17}/> Register patient</button>}<button className="hero-link" onClick={()=>navigate(canBook(role)?'queue':'patients')}>{canBook(role)?'View demo queue':'View sample patients'} <ArrowRight size={17}/></button></div></div><div className="hero-symbol"><HeartPulse size={116} strokeWidth={0.9}/></div></div>
          <div className="stat-grid">
            <StatCard icon={Users} label="Sample patients" value={patients.length} helper="Synthetic records for UI review" tone="teal" />
            <StatCard icon={CalendarDays} label="Today's appointments" value={todaysAppointments.length} helper="Synthetic clinic-day schedule" tone="indigo" />
            <StatCard icon={Clock3} label="In active queue" value={waiting} helper="Waiting, triage or consultation" tone="amber" />
            <StatCard icon={CircleCheck} label="Completed visits" value={queue.filter(q=>q.stage==='Completed').length} helper="Demo queue entries" tone="blue" />
            <StatCard icon={Clock3} label="Patients waiting" value={queue.filter(q=>q.stage==='Waiting').length} helper="Synthetic active waiting visits"/>
            <StatCard icon={Stethoscope} label="In consultation" value={queue.filter(q=>q.stage==='Consultation').length} helper="Synthetic consultation visits"/>
            <StatCard icon={FlaskConical} label="Pending lab requests" value={operations.labs.filter(l=>l.status==='Pending').length} helper="Requests from demo consultations"/>
            {['Administrator','Cashier','Management'].includes(role)&&<StatCard icon={CreditCard} label="Demo outstanding bills" value={amountLabel(operations.invoices.reduce((s,i)=>s+i.amount-i.paid,0))} helper="Simulated financial records only"/>}
          </div>
          <div className="dashboard-grid">
            {visibleItems.some(i=>i.id==='patients')&&<section className="surface-card appointments-card"><SectionTitle title="Upcoming appointments" detail="Synthetic appointments for layout testing" action={canBook(role) && <button className="text-button" onClick={()=>navigate('appointments')}>View all <ArrowUpRight size={15}/></button>}/>
              <div className="appointment-list">{upcomingAppointments.map(item=>{
                const p=patients.find(p=>p.id===item.patientId)
                return <button key={item.id} className="appointment-row" onClick={()=>{if(p)openPatient(p)}}>
                  <div className="appointment-time"><strong>{item.time}</strong><span>{item.date===clinicDate()?'Today':item.date}</span></div><Avatar initials={p?.initials||'?'} color={p?.avatar}/><div className="appointment-info"><strong>{item.patientName}</strong><span>{item.reason}</span></div><Status value={item.status}/><ChevronRight size={16} className="muted"/>
                </button>})}</div>
              {upcomingAppointments.length===0 && <BlankState title="No upcoming appointments" description="Confirmed sample bookings will appear here."/>}
            </section>}
            <section className="surface-card journey-card"><SectionTitle title="Today's patient journey" detail="A simple view of where visits move"/>
              <div className="journey-list">{[
                {name:'Waiting',value:queue.filter(q=>q.stage==='Waiting').length,color:'gray'},
                {name:'At triage',value:queue.filter(q=>q.stage==='Triage').length,color:'blue'},
                {name:'In consultation',value:queue.filter(q=>q.stage==='Consultation').length,color:'teal'},
                {name:'Completed',value:queue.filter(q=>q.stage==='Completed').length,color:'green'},
              ].map(item=><div key={item.name} className="journey-row"><span className={`journey-bullet bullet-${item.color}`}/><span>{item.name}</span><div className="journey-line"><div style={{width:`${queue.length?item.value/queue.length*100:0}%`}} className={`journey-progress progress-${item.color}`}/></div><b>{item.value}</b></div>)}</div>
              {canBook(role) && <button className="subtle-link" onClick={()=>navigate('queue')}>Open patient queue <ArrowRight size={16}/></button>}
            </section>
          </div>
          <div className="shortcut-row">
            {canRegister(role) && <button className="shortcut" onClick={()=>setModal('patient')}><div className="shortcut-icon"><UserRoundPlus size={20}/></div><span><b>New patient</b><small>Create a demo record</small></span><ArrowUpRight size={17}/></button>}
            {canBook(role) && <><button className="shortcut" onClick={()=>openAppointment()}><div className="shortcut-icon shortcut-violet"><CalendarDays size={20}/></div><span><b>Book appointment</b><small>Add a sample booking</small></span><ArrowUpRight size={17}/></button><button className="shortcut" onClick={()=>navigate('queue')}><div className="shortcut-icon shortcut-coral"><ClipboardList size={20}/></div><span><b>Visit queue</b><small>Review stage progress</small></span><ArrowUpRight size={17}/></button></>}
          </div>
          <section className="surface-card core-card"><h2>Recent demo activity</h2>{operations.events.length?<ul>{operations.events.slice(0,5).map(e=><li key={e.id}>{e.action} · {e.actor} · {e.resource}</li>)}</ul>:<p>No demo changes recorded yet.</p>}</section>
        </>}
        {allowedScreen==='patients' && <>
          <div className="main-heading"><div><div className="page-eyebrow">PATIENT MANAGEMENT</div><h1>Patients</h1><p>Find a sample patient or register a fictional record.</p></div>{canRegister(role) && <button className="button primary" onClick={()=>{setEditingPatient(undefined);setModal('patient')}}><Plus size={18}/> Register patient</button>}</div>
          <div className="surface-card listing-card"><div className="listing-heading"><div><h2>Patient directory</h2><p>{filteredPatients.length} of {patients.length} synthetic patients</p></div><div className="list-controls"><label className="search-input"><Search size={17}/><input aria-label="Search patients" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or patient ID" /></label><select aria-label="Filter patients" className="filter-select" value={patientFilter} onChange={e=>setPatientFilter(e.target.value)}>{['All patients','Active','Follow-up','New'].map(x=><option key={x}>{x}</option>)}</select></div></div>
            <label className="sort-control">Sort patients <select value={patientSort} onChange={e=>setPatientSort(e.target.value)}><option>Name</option><option>Patient ID</option></select></label>
            {route.detail&&route.detail!=='new'&&!patients.some(p=>p.id===route.detail)&&<p role="alert">This patient is not in the demo directory. Refresh restores initial fixtures.</p>}
            <DataTable caption="Synthetic patient directory" rows={filteredPatients} rowKey={p=>p.id} columns={[
              {id:'patient',label:'Patient',render:p=><div className="patient-cell"><Avatar initials={p.initials} color={p.avatar}/><strong>{p.name}</strong></div>},
              {id:'id',label:'Patient ID',render:p=><span className="mono">{p.id}</span>},
              {id:'demographics',label:'Sex / age',render:p=>`${p.sex}, ${p.age} yrs`},
              {id:'visit',label:'Last visit',render:p=>p.lastVisit},
              {id:'status',label:'Status',render:p=><Status value={p.status}/>},
              {id:'action',label:'Action',render:p=><button className="table-action" aria-label={`View patient ${p.name}`} onClick={()=>openPatient(p)}>View patient <ArrowRight size={15}/></button>},
            ]}/>
            {filteredPatients.length===0 && <><BlankState title="No matching patients" description="Try changing your search or status filter."/><button className="button outline" onClick={()=>{setSearch('');setPatientFilter('All patients')}}>Clear filters</button></>}
            <div className="table-footer"><span>In-memory UI data only; no live database connection</span><span aria-live="polite">{filteredPatients.length} results</span></div>
          </div>
        </>}
        {allowedScreen==='appointments' && <>
          <div className="main-heading"><div><div className="page-eyebrow">SCHEDULING</div><h1>Appointments</h1><p>Book a sample visit, then check in to the demonstration queue.</p></div><button className="button primary" onClick={()=>openAppointment()}><Plus size={18}/> New appointment</button></div>
          <div className="schedule-header surface-card"><div><div className="schedule-month">Clinic schedule</div><p>{today} | East Africa Time (UTC+3)</p><p>All demo dates are shown. Check-in is available for today's confirmed bookings.</p></div><div className="schedule-icon"><CalendarDays size={23}/></div></div>
          <div className="surface-card listing-card"><SectionTitle title="Scheduled visits" detail="Synthetic records; provider availability is not checked"/>
            <div className="list-controls"><label className="sort-control">Appointment filter <select aria-label="Appointment filter" value={appointmentFilter} onChange={e=>setAppointmentFilter(e.target.value)}>{['All','Upcoming','Confirmed','Waiting','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label><button className="button outline" aria-pressed={calendar} onClick={()=>setCalendar(!calendar)}>{calendar?'List view':'Calendar view'}</button></div>
            {calendar&&<div className="calendar-grid" aria-label="Appointment agenda by day">{[...new Set(displayedAppointments.map(a=>a.date))].map(date=><section key={date}><h3>{date}</h3>{displayedAppointments.filter(a=>a.date===date).map(a=><p key={a.id}><b>{a.time}</b> {a.patientName}<br/><Status value={a.status}/></p>)}</section>)}</div>}
            {!calendar&&<DataTable caption="Synthetic appointment schedule" rows={displayedAppointments} rowKey={a=>a.id} columns={[
              {id:'time',label:'Date / time (EAT)',render:a=><><strong>{a.time}</strong><div className="tiny-muted">{a.date}</div></>},
              {id:'patient',label:'Patient',render:a=><><strong>{a.patientName}</strong><div className="tiny-muted mono">{a.patientId}</div></>},
              {id:'reason',label:'Visit type',render:a=>a.reason},
              {id:'provider',label:'Provider',render:a=>a.provider},
              {id:'status',label:'Status',render:a=><Status value={a.status==='Waiting'?'Checked in':a.status}/>},
              {id:'action',label:'Actions',render:a=><div className="row-actions">{a.status==='Confirmed' ? <>
                {canRegister(role) && a.date===clinicDate() && <button className="table-action" aria-label={`Check in ${a.patientName}`} onClick={()=>checkIn(a)}>Check in</button>}
                <button className="table-action danger-text" aria-label={`Cancel appointment for ${a.patientName}`} onClick={()=>setPendingCancel(a)}>Cancel</button>
                <button className="table-action" aria-label={`Reschedule ${a.patientName}`} onClick={()=>{setRescheduling(a);setModal('appointment')}}>Reschedule</button>
              </> : a.status==='Waiting' ? <button className="table-action" onClick={()=>navigate('queue')}>View queue <ArrowRight size={14}/></button> : <span>No action</span>}</div>},
            ]}/>}
            {displayedAppointments.length===0 && <BlankState title="No appointments" description="Change the filter or create a demo appointment using the button above."/>}
          </div>
        </>}
        {allowedScreen==='queue' && <>
          <div className="main-heading"><div><div className="page-eyebrow">RECEPTION / NURSING / DOCTOR</div><h1>Patient Queue</h1><p>Follow each synthetic visit through the proposed staff workflow.</p></div><div className="page-actions"><button className="button outline" onClick={()=>navigate('appointments')}><CalendarDays size={17}/> Appointment check-in</button>{canRegister(role) && <button className="button primary" onClick={()=>openWalkIn()}><Plus size={18}/> Add demo walk-in</button>}</div></div>
          <div className="queue-summary">{(['Waiting','Triage','Consultation','Completed'] as const).map(stage=><button className={`queue-mini ${queueFilter===stage?'queue-mini-active':''}`} aria-pressed={queueFilter===stage} key={stage} onClick={()=>setQueueFilter(queueFilter===stage?'All stages':stage)}><div className="queue-mini-number">{queue.filter(q=>q.stage===stage).length}</div><div className="queue-mini-text">{stage}</div></button>)}</div>
          <div className="surface-card listing-card"><div className="listing-heading"><div><h2>Visit progress</h2><p>{filteredQueue.length} of {queue.length} synthetic queue entries</p></div><select className="filter-select" aria-label="Filter queue stage" value={queueFilter} onChange={e=>setQueueFilter(e.target.value)}>{['All stages','Waiting','Triage','Consultation','Completed'].map(x=><option key={x}>{x}</option>)}</select></div>
            <DataTable caption="Synthetic visit queue" rows={filteredQueue} rowKey={q=>q.id} columns={[
              {id:'visit',label:'Queue / visit',render:q=><><span className="mono">{q.id}</span><div className="tiny-muted mono">{q.encounterId}</div></>},
              {id:'patient',label:'Patient',render:q=><><strong>{q.patientName}</strong><div className="tiny-muted mono">{q.patientId}</div></>},
              {id:'service',label:'Service / arrival',render:q=><>{q.service}<div className="tiny-muted">{q.appointmentId ? 'Appointment' : 'Walk-in'}</div></>},
              {id:'time',label:'Check-in (EAT)',render:q=>q.time},
              {id:'stage',label:'Stage',render:q=><Status value={q.stage}/>},
              {id:'action',label:'Next step',render:q=>q.stage==='Completed' ? <span>Complete</span> : canAdvance(role,q.stage) ? <button className="table-action" aria-label={`Move ${q.patientName} to ${nextStage(q.stage)}`} onClick={()=>setPendingStage(q)}>To {nextStage(q.stage)} <ArrowRight size={14}/></button> : <span>{q.stage==='Consultation'?'Doctor':'Nurse'} preview action</span>},
            ]}/>
            {filteredQueue.length===0 && <BlankState title="No queue entries" description="Choose another stage to see sample visits."/>}
          </div><div className="inline-notice"><Info size={18}/><span>Design only: reception checks in; nurses move waiting and triage visits; doctors complete consultations; administrators can preview all transitions. The clinic must approve this matrix. Go APIs must enforce permissions and audit events.</span></div>
        </>}
        {(allowedScreen==='triage'||allowedScreen==='consultations')&&<Clinical key={allowedScreen} kind={allowedScreen} role={role} patients={patients} queue={queue} operations={operations} change={changeOperations} advance={queueStep}/>}
        {(allowedScreen==='laboratory'||allowedScreen==='pharmacy')&&<Requests key={allowedScreen} kind={allowedScreen} role={role} operations={operations} patients={patients} change={changeOperations}/>}
        {allowedScreen==='billing'&&<Billing operations={operations} patients={patients} change={changeOperations}/>}
        {allowedScreen==='reports'&&<Reports role={role} operations={operations} patients={patients} appointments={appointments} queue={queue}/>}
        {(allowedScreen==='team'||allowedScreen==='settings')&&<Administration key={allowedScreen} operations={operations} change={changeOperations} settings={allowedScreen==='settings'} reset={()=>{reset();notify('All synthetic demo data restored.')}}/>}
        {allowedScreen==='telemedicine'&&<Telemedicine appointments={appointments} book={()=>openAppointment()}/>}
        {allowedScreen==='account'&&<DemoAccount role={role} exit={exitPreview}/>}
        {!known&&<section className="surface-card state-card"><h1>Page not found</h1><p>This address does not match a workspace page.</p><button className="button primary" onClick={()=>navigate('dashboard')}>Return to dashboard</button></section>}
        </ScreenState>
      </main>
      <footer className="workspace-footer">Spartial Healthcare Workspace <span>•</span> Design exploration · Synthetic data only · No clinical use</footer>
    </div>
    {selectedPatient && canView && <PatientCard patient={selectedPatient} role={role} appointments={appointments} queue={queue} operations={operations} change={changeOperations}
      close={()=>{setSelectedPatient(null);navigateRoute('patients')}}
      update={updated=>{setPatients(prev=>prev.map(p=>p.id===updated.id?updated:p));log('Demo patient history updated',updated.id)}}
      edit={canRegister(role)?()=>{setEditingPatient(selectedPatient);setSelectedPatient(null);setModal('patient')}:undefined}
      book={canBook(role)?()=>{const id=selectedPatient.id;setSelectedPatient(null);openAppointment(id)}:undefined}
      walkIn={canRegister(role)?()=>{const id=selectedPatient.id;setSelectedPatient(null);openWalkIn(id)}:undefined}/>}
    {modal==='patient' && canRegister(role) && <PatientForm patients={patients} patient={editingPatient} close={()=>{setModal(null);setEditingPatient(undefined);if(route.detail==='new')navigateRoute('patients')}} create={addPatient}/>}
    {modal==='appointment' && canBook(role) && <AppointmentForm patients={patients} appointments={appointments} departments={operations.departments} appointment={rescheduling} initialPatientId={appointmentPatientId} close={()=>setModal(null)} create={addAppointment}/>}
    {modal==='walk-in' && canRegister(role) && <WalkInForm patients={patients} queue={queue} initialPatientId={walkInPatientId} close={()=>setModal(null)} create={addWalkIn}
      reviewQueue={()=>{setModal(null);setQueueFilter('All stages');navigate('queue')}} registerPatient={()=>{setSelectedPatient(null);navigateRoute('patients','new')}}/>}
    {pendingCancel && <ConfirmDialog tone="danger" title="Cancel demo appointment?" description={`Cancel ${pendingCancel.patientName}'s sample booking on ${pendingCancel.date} at ${pendingCancel.time}? This only changes this preview. Checked-in visits must be reviewed in the queue.`} confirmLabel="Cancel demo appointment" close={()=>setPendingCancel(null)} confirm={()=>{setAppointments(prev=>cancelAppointment(prev,queue,pendingCancel.id));setPendingCancel(null);notify('Demo appointment cancelled in memory. No real booking was changed.')}}/>}
    {pendingStage && <ConfirmDialog title="Move demo visit?" description={`Move ${pendingStage.patientName} (${pendingStage.encounterId}) from ${pendingStage.stage} to ${nextStage(pendingStage.stage)}? This is a local workflow demonstration.`} confirmLabel={`Move to ${nextStage(pendingStage.stage)}`} close={()=>setPendingStage(null)} confirm={()=>queueStep(pendingStage.id)}/>}
    {message && <div className="toast" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={()=>setMessage('')}><X size={16}/></button></div>}
  </div>
}

export default function App() {return import.meta.env.VITE_DATA_MODE==='api'?<ApiWorkspace/>:<DemoApp/>}

