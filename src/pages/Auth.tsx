import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, HeartPulse, LockKeyhole } from 'lucide-react'
import { api } from '../api'
import type { Actor, Challenge, Enrollment, StaffSession } from '../api/types'
import { Brand, DataTable, EmptyState, ErrorNotice, FormField, PageHeader, ResourceState } from '../components/ui'
import { useResource } from '../hooks'

export function Login({ onEnter, notice, connectionError }: { onEnter:(actor:Actor)=>void; notice:string; connectionError:unknown }) {
  const [busy,setBusy]=useState(false), [error,setError]=useState<unknown>(null), [show,setShow]=useState(false)
  const [challenge,setChallenge]=useState<Challenge|null>(null), [recovery,setRecovery]=useState(false), [expired,setExpired]=useState(false)
  useEffect(()=>{
    if(!challenge)return
    setExpired(false)
    const timeout=setTimeout(()=>{setExpired(true);setChallenge(null)},Math.min(challenge.expires_in,300)*1000)
    return ()=>clearTimeout(timeout)
  },[challenge])
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget,data=new FormData(form)
    setBusy(true);setError(null)
    try {
      const result=challenge ? await api.verify(challenge.challenge_token,recovery?{recovery_code:String(data.get('factor')).trim()}:{code:String(data.get('factor')).trim()}) : await api.login(String(data.get('email')).trim(),String(data.get('password')))
      if('mfa_required' in result){setChallenge(result);form.reset()}
      else onEnter(result)
    } catch(reason){setError(reason)} finally {setBusy(false)}
  }
  return <div className="login-shell"><div className="login-illustration"><Brand/><div className="login-promo">
    <span className="intro-tag"><HeartPulse size={16}/> SPARTIAL STAFF WORKSPACE</span><h1>Care feels better<br/>when everything<br/><em>connects.</em></h1>
    <p>A focused workspace for your clinic team.</p></div><span className="login-bottom">Spartial Specialized Polyclinic</span></div>
    <main className="login-form-column"><div className="login-mobile-brand"><Brand/></div><div className="login-form-card">
      <div className="login-intro-icon"><LockKeyhole size={25}/></div><h2>{challenge?'Verify your sign-in':'Welcome back'}</h2><p className="login-subtitle">{challenge?'Enter a code from your authenticator or use an unused recovery code.':'Sign in with your staff account to continue.'}</p>
      {notice&&<p className="notice" role="status">{notice}</p>}{expired&&<p role="alert">Verification expired. Sign in again.</p>}<ErrorNotice error={error||connectionError}/>
      <form onSubmit={submit} className="auth-form" key={challenge?'mfa':'login'} aria-busy={busy}>
        {challenge ? <><FormField id="factor" label={recovery?'Recovery code':'Authenticator code'}><input autoFocus id="factor" name="factor" required autoComplete="one-time-code" inputMode={recovery?'text':'numeric'} pattern={recovery?undefined:'[0-9]{6}'} maxLength={recovery?100:6}/></FormField>
          <button type="button" className="inline-button" disabled={busy} onClick={()=>{setRecovery(!recovery);setError(null)}}>{recovery?'Use authenticator code':'Use a recovery code'}</button></> : <>
          <FormField id="email" label="Staff email"><input autoFocus id="email" name="email" type="email" autoComplete="username" required maxLength={254}/></FormField>
          <FormField id="password" label="Password"><div className="password-wrap"><input id="password" name="password" type={show?'text':'password'} autoComplete="current-password" required maxLength={256}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></FormField></>}
        <button className="button primary login-submit" disabled={busy}>{busy?'Please wait…':challenge?'Verify & sign in':'Sign in'}</button>
        {challenge&&<button type="button" className="button outline" disabled={busy} onClick={()=>{setChallenge(null);setError(null)}}>Back to sign in</button>}
      </form><p className="login-helper">Forgot your password or account unavailable? Contact your authorised system administrator. Self-service password recovery is not available.</p>
    </div></main></div>
}

export function Account({ actor, updateActor, signedOut }: {actor:Actor;updateActor:(actor:Actor)=>void;signedOut:(notice?:string)=>void}) {
  const sessions=useResource(useCallback(signal=>api.request<{items:StaffSession[]}>('/auth/sessions',{signal}),[]))
  const [error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  const [enrollment,setEnrollment]=useState<Enrollment|null>(null),[codes,setCodes]=useState<string[]>([])
  async function password(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget,data=new FormData(form)
    if(data.get('new_password')!==data.get('confirm_password')){setError(new Error('The new passwords must match.'));return}
    setBusy(true);setError(null);setNotice('')
    try {await api.request('/auth/password',{method:'POST',body:{current_password:data.get('current_password'),new_password:data.get('new_password')}});form.reset();signedOut('Password changed. All sessions ended. Sign in with your new password.')}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  async function enroll(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setError(null)
    try {setEnrollment(await api.request<Enrollment>('/auth/mfa/enroll',{method:'POST',body:{current_password:data.get('current_password')}}));form.reset()}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  async function confirm(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null)
    try {const result=await api.request<{recovery_codes:string[]}>('/auth/mfa/confirm',{method:'POST',body:{code:data.get('code')}});setCodes(result.recovery_codes);setEnrollment(null);updateActor(await api.me());sessions.retry();setNotice('Two-step verification enabled. Save your recovery codes now.')}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  async function revoke(session:StaffSession) {
    if(!window.confirm('Revoke this session? If this is your current session, you will need to sign in again.'))return
    setBusy(true);setError(null)
    try {await api.request(`/auth/sessions/${encodeURIComponent(session.id)}/revoke`,{method:'POST'});setNotice('Session revoked.');sessions.retry()}
    catch(reason){setError(reason)}finally{setBusy(false)}
  }
  return <><PageHeader title="Account & security" eyebrow="YOUR ACCOUNT" description={`${actor.display_name} · ${actor.email}`}/>
    {notice&&<div className="notice success" role="status">{notice}</div>}<ErrorNotice error={error}/>
    <div className="core-grid"><section className="surface-card core-card"><h2>Change password</h2><p>Use at least 12 characters. Changing your password ends all sessions.</p>
      <form className="auth-form" onSubmit={password} aria-busy={busy}><FormField id="current-password" label="Current password"><input id="current-password" name="current_password" type="password" autoComplete="current-password" required maxLength={256}/></FormField>
      <FormField id="new-password" label="New password"><input id="new-password" name="new_password" type="password" autoComplete="new-password" required minLength={12} maxLength={256}/></FormField>
      <FormField id="confirm-password" label="Confirm new password"><input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={256}/></FormField><button className="button primary" disabled={busy}>Change password</button></form></section>
      <section className="surface-card core-card"><h2>Two-step verification</h2><p>{actor.mfa_verified?'Your current session has completed two-step verification.':'Some actions require an authenticator code. Set up verification to continue.'}</p>
        {codes.length>0?<><p>These codes are shown once. Keep them in a safe place outside this workspace.</p><ul className="recovery-codes">{codes.map(code=><li key={code}><code>{code}</code></li>)}</ul><button className="button outline" onClick={()=>setCodes([])}>I have saved my recovery codes</button></>:
        enrollment?<form className="auth-form" onSubmit={confirm}><p>Add an account manually in your authenticator with this setup key. Do not share it.</p><code className="setup-secret">{enrollment.secret}</code><FormField id="mfa-code" label="Authenticator code"><input autoFocus id="mfa-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required/></FormField><button className="button primary" disabled={busy}>Confirm setup</button><button type="button" className="button outline" disabled={busy} onClick={()=>setEnrollment(null)}>Cancel setup</button></form>:
        !actor.mfa_verified?<form className="auth-form" onSubmit={enroll}><FormField id="mfa-password" label="Current password"><input id="mfa-password" name="current_password" type="password" autoComplete="current-password" required maxLength={256}/></FormField><button className="button primary" disabled={busy}>Set up authenticator</button></form>:<p className="field-hint">Recovery-code replacement and disabling verification require the approved account recovery procedure.</p>}
      </section></div>
    <section className="surface-card core-card"><h2>Sessions</h2><ResourceState {...sessions}>{!sessions.data?.items.length?<EmptyState title="No sessions returned" description="Refresh to check your active sessions."/>:<DataTable caption="Your sessions" rows={sessions.data.items} rowKey={row=>row.id} columns={[
      {id:'device',label:'Device',render:row=><strong>{row.device_label||row.client_type}</strong>}, {id:'seen',label:'Last seen',render:row=>new Date(row.last_seen_at).toLocaleString()},
      {id:'status',label:'Status',render:row=>row.revoked_at?'Revoked':'Active'}, {id:'action',label:'Action',render:row=>!row.revoked_at&&<button className="table-action" disabled={busy} onClick={()=>revoke(row)}>Revoke session</button>},
    ]}/>}</ResourceState></section></>
}
