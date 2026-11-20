import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { ApiError } from './api/client'
import type { Actor } from './api/types'

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setData(null)
    load(controller.signal).then(value => { if (!controller.signal.aborted) setData(value) }).catch(reason => { if (!controller.signal.aborted) setError(reason) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [load, revision])
  return { data, error, loading, retry }
}

const LOCK_KEY = 'spartial-session-locked'
function isLocked() { try { return sessionStorage.getItem(LOCK_KEY) === '1' } catch { return false } }
function setLocked(locked: boolean) { try { if (locked) sessionStorage.setItem(LOCK_KEY, '1'); else sessionStorage.removeItem(LOCK_KEY) } catch { /* No sensitive data or credentials are stored. */ } }

export function useSession(enabled = true) {
  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [connectionError, setConnectionError] = useState<unknown>(null)
  const actorRef = useRef(actor); actorRef.current = actor
  useEffect(() => {
    let current = true
    if (!enabled) { setLoading(false); return () => { current = false } }
    api.onSessionLost = () => {
      if (!current) return
      if (actorRef.current) setNotice('Your session ended. Sign in again to continue.')
      setActor(null)
    }
    if (isLocked()) { setNotice('Your workspace was locked. Sign in to continue.'); setLoading(false) }
    else api.restore().then(value => { if (current) setActor(value) }).catch(error => {
      if (current && (!(error instanceof ApiError) || error.status !== 401)) setConnectionError(error)
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false; api.onSessionLost = () => {} }
  }, [enabled])
  const signedIn = (value: Actor) => { setLocked(false); setConnectionError(null); setNotice(''); setActor(value) }
  const signedOut = (message = 'You have signed out.') => { api.clear(); setLocked(true); setActor(null); setNotice(message) }
  const lock = useCallback(() => {
    // Hide records immediately, even if the server cannot be reached to revoke the session.
    const revoke = api.logout()
    setLocked(true); setActor(null); setNotice('Your workspace locked after 15 minutes of inactivity. Sign in to continue.')
    api.clear()
    void revoke.catch(() => {})
  }, [])
  return { actor, loading, notice, connectionError, signedIn, signedOut, lock, updateActor: setActor }
}

export function useHumanIdleLock(lock: () => void) {
  useEffect(() => {
    let lastActivity = Date.now()
    const limit = 15 * 60 * 1000
    const activity = (event: Event) => { if (event.isTrusted) lastActivity = Date.now() }
    const check = () => { if (Date.now() - lastActivity >= limit) lock() }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach(event => window.addEventListener(event, activity, { passive: true }))
    document.addEventListener('visibilitychange', check)
    const interval = setInterval(check, 1000)
    return () => { clearInterval(interval); events.forEach(event => window.removeEventListener(event, activity)); document.removeEventListener('visibilitychange', check) }
  }, [lock])
}
