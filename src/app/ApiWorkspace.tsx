import { useState } from 'react'
import { api } from '../api'
import { can } from '../api/types'
import { useHumanIdleLock, useSession } from '../hooks'
import { AccessDenied, Brand, ConfirmDialog, PageHeader } from '../components/ui'
import { Account, Login } from '../pages/Auth'
import { Patients } from '../pages/Patients'
import { Audit, Facilities, Staff } from '../pages/Administration'
import { useHashRoute } from './routing'

/** Opt-in adapter preview. Demo mode never mounts this component or makes API requests. */
export function ApiWorkspace() {
  const session=useSession()
  if(session.loading)return <main className="state-card" aria-busy="true"><Brand/><p role="status">Restoring session…</p></main>
  if(!session.actor)return <Login onEnter={session.signedIn} notice={session.notice} connectionError={session.connectionError}/>
  return <ApiContent session={session}/>
}
function ApiContent({session}:{session:ReturnType<typeof useSession>}) {
    const [route,navigate]=useHashRoute(),[logout,setLogout]=useState(false),[busy,setBusy]=useState(false)
    useHumanIdleLock(session.lock)
    const actor=session.actor!,security=()=>navigate('account')
    const pages=[['dashboard','Dashboard',''],['patients','Patients','patients.read'],['team','Staff accounts','staff.read'],['settings','Facilities','facilities.read'],['audit','Audit log','audit.read'],['account','Account & security','']]
    const page=pages.find(p=>p[0]===route.section),permitted=page&&(!page[2]||can(actor,page[2]))
    async function signOut(){setBusy(true);try{await api.logout();session.signedOut()}catch{session.signedOut('Workspace closed. Server revocation could not be confirmed. Sign in again or contact your administrator.')}finally{setBusy(false)}}
    return <div className="app-shell api-shell"><aside className="sidebar"><div className="sidebar-brand"><Brand/></div><nav className="nav-area" aria-label="API workspace">{pages.filter(p=>!p[2]||can(actor,p[2])).map(p=><button key={p[0]} className={`nav-link ${route.section===p[0]?'nav-link-active':''}`} onClick={()=>navigate(p[0])}>{p[1]}</button>)}</nav><button className="button outline" onClick={()=>setLogout(true)}>Sign out</button></aside><div className="workspace"><header className="topbar"><span>API adapter preview · {actor.display_name}</span><label className="api-navigation">Page <select value={page?route.section:''} onChange={e=>navigate(e.target.value)}><option value="" disabled>Choose page</option>{pages.filter(p=>!p[2]||can(actor,p[2])).map(p=><option key={p[0]} value={p[0]}>{p[1]}</option>)}</select></label><button className="button outline" onClick={()=>setLogout(true)}>Sign out</button></header><main className="main-area" id="main-content" tabIndex={-1}>
      {!page?<PageHeader title="Page not found" eyebrow="404" description="Choose a page from the navigation."/>:!permitted?<AccessDenied/>:route.section==='patients'?<Patients actor={actor} security={security}/>:route.section==='team'?<Staff actor={actor} security={security} signedOut={session.signedOut}/>:route.section==='settings'?<Facilities actor={actor} security={security}/>:route.section==='audit'?<Audit security={security}/>:route.section==='account'?<Account actor={actor} updateActor={session.updateActor} signedOut={session.signedOut}/>:<><PageHeader title="Staff workspace" eyebrow="API ADAPTER PREVIEW" description={`Signed in as ${actor.role}. Access is determined by server permissions.`}/><p className="notice">Operational metrics, departments, documents and clinical workflows are not connected. This adapter requires integration testing against an approved staging backend.</p></>}
    </main></div>{logout&&<ConfirmDialog title="Sign out?" description="Close this workspace and revoke the current session." confirmLabel="Sign out" busy={busy} close={()=>setLogout(false)} confirm={()=>void signOut()}/>}</div>
}
