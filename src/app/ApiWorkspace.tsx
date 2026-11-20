import { useState } from 'react'
import { api } from '../api'
import { useHumanIdleLock, useSession } from '../hooks'
import { AccessDenied, Brand, ConfirmDialog, PageHeader } from '../components/ui'
import { Account, Login } from '../pages/Auth'
import { Patients } from '../pages/Patients'
import { Appointments, Queue } from '../pages/Scheduling'
import { Audit, Facilities, Staff } from '../pages/Administration'
import { useHashRoute } from './routing'
import { findModule, mayOpenModule, modules } from './modules'

// Explicit local development opt-in only. Production remains gated pending
// end-to-end testing and review of the deployment's cookie and Origin policy.
const BACKEND_INTEGRATION_READY = import.meta.env.DEV && import.meta.env.VITE_ENABLE_BACKEND === 'true'

export function ApiWorkspace() {
  const session=useSession(BACKEND_INTEGRATION_READY)
  if(session.loading)return <main className="state-card" aria-busy="true"><Brand/><p role="status">Restoring session…</p></main>
  if(!session.actor)return <Login connected={BACKEND_INTEGRATION_READY} onEnter={session.signedIn} notice={session.notice} connectionError={session.connectionError}/>
  return <ApiContent session={session}/>
}
function ApiContent({session}:{session:ReturnType<typeof useSession>}) {
    const [route,navigate]=useHashRoute(),[logout,setLogout]=useState(false),[busy,setBusy]=useState(false)
    useHumanIdleLock(session.lock)
    const actor=session.actor!,security=()=>navigate('account')
    const page=findModule(route.section),permitted=page&&mayOpenModule(page,actor.permissions)
    const visible=modules.filter(p=>mayOpenModule(p,actor.permissions))
    async function signOut(){setBusy(true);try{await api.logout();session.signedOut()}catch{session.signedOut('Workspace closed. Server revocation could not be confirmed. Sign in again or contact your administrator.')}finally{setBusy(false)}}
    return <div className="app-shell api-shell"><aside className="sidebar"><div className="sidebar-brand"><Brand/></div><nav className="nav-area" aria-label="Staff workspace">{visible.map(p=><button key={p.id} className={`nav-link ${route.section===p.id?'nav-link-active':''}`} aria-current={route.section===p.id?'page':undefined} onClick={()=>navigate(p.id)}>{p.title}</button>)}</nav><button className="button outline" onClick={()=>setLogout(true)}>Sign out</button></aside><div className="workspace"><header className="topbar"><span>Staff workspace · {actor.display_name}</span><label className="api-navigation">Page <select value={page&&permitted?route.section:''} onChange={e=>navigate(e.target.value)}><option value="" disabled>Choose page</option>{visible.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button className="button outline" onClick={()=>setLogout(true)}>Sign out</button></header><main className="main-area" id="main-content" tabIndex={-1}>
      {!page?<PageHeader title="Page not found" eyebrow="404" description="Choose a page from the navigation."/>:!permitted?<AccessDenied/>:route.section==='patients'?<Patients actor={actor} security={security}/>:route.section==='appointments'?<Appointments security={security}/>:route.section==='queue'?<Queue security={security}/>:route.section==='team'?<Staff actor={actor} security={security} signedOut={session.signedOut}/>:route.section==='settings'?<Facilities actor={actor} security={security}/>:route.section==='audit'?<Audit security={security}/>:route.section==='account'?<Account actor={actor} updateActor={session.updateActor} signedOut={session.signedOut}/>:<><PageHeader title={page.title} eyebrow="STAFF WORKSPACE" description="This area requires a connected backend service."/><section className="surface-card state-card" role="status"><h2>Not connected yet</h2><p>Data and actions for {page.title.toLowerCase()} will be available after the backend contract and access rules are implemented.</p></section></>}
    </main></div>{logout&&<ConfirmDialog title="Sign out?" description="Close this workspace and revoke the current session." confirmLabel="Sign out" busy={busy} close={()=>setLogout(false)} confirm={()=>void signOut()}/>}</div>
}
