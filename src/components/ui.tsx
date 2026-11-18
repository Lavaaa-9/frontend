import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, LockKeyhole, Search, X } from 'lucide-react'
import { ApiError } from '../api/client'

export function Brand() {
  return <div className="brand brand-official"><img className="brand-image" src="/spartial-logo.jpg" alt="Spartial Specialized Polyclinic"/></div>
}
export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <span className="avatar avatar-blue" aria-hidden="true">{initials}</span>
}
export function Dialog({ label, children, close, className = 'modal', describedBy }: {
  label: string; children: ReactNode; close: () => void; className?: string; describedBy?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
    return () => {
      dialog.close(); document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
      else document.querySelector<HTMLElement>('#main-content')?.focus()
    }
  }, [])
  return <dialog ref={ref} className={className} aria-label={label} aria-describedby={describedBy}
    onCancel={event => { event.preventDefault(); close() }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
    }}>{children}</dialog>
}
export function Modal({ title, subtitle, children, close }: { title: string; subtitle: string; children: ReactNode; close: () => void }) {
  const id = useId()
  return <Dialog label={title} close={close} describedBy={id}><div className="modal-header"><div><h2>{title}</h2><p id={id}>{subtitle}</p></div>
    <button type="button" className="icon-button" aria-label={`Close ${title}`} onClick={close}><X size={20}/></button>
  </div>{children}</Dialog>
}
export function ConfirmDialog({ title, description, confirmLabel, close, confirm, busy = false, error }: {
  title: string; description: string; confirmLabel: string; close: () => void; confirm: () => void; busy?: boolean; error?: unknown
}) {
  return <Modal title={title} subtitle="Please review this change" close={()=>{if(!busy)close()}}><div className="modal-form">
    <p>{description}</p><ErrorNotice error={error}/><div className="form-actions"><button data-initial-focus disabled={busy} className="button outline" onClick={close}>Keep unchanged</button>
      <button disabled={busy} className="button danger" onClick={confirm}>{busy?'Saving…':confirmLabel}</button></div>
  </div></Modal>
}
export function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}
    {hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
  </div>
}
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase().replace(/\s+/g,'-')}`}><span className="status-dot" aria-hidden="true"/>{value}</span>
}
export function DataTable<T>({ caption, columns, rows, rowKey }: {
  caption: string; columns: { id: string; label: string; render: (row: T) => ReactNode }[]; rows: T[]; rowKey: (row: T) => string
}) {
  return <div className="table-scroll" role="region" aria-label={`${caption} — scroll horizontally on small screens`} tabIndex={0}>
    <table className="data-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map(column=><th scope="col" key={column.id}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={rowKey(row)}>{columns.map(column=><td key={column.id}>{column.render(row)}</td>)}</tr>)}</tbody>
    </table>
  </div>
}
export function PageHeader({ title, eyebrow, description, action }: { title: string; eyebrow: string; description: string; action?: ReactNode }) {
  return <div className="main-heading"><div><div className="page-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
export function ErrorNotice({ error }: { error?: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : 'The request could not be completed.'
  const fields = error instanceof ApiError ? Object.values(error.fields) : []
  return <div className="error-notice" role="alert"><AlertCircle size={18}/><div><p>{message}</p>{fields.length>0 && <ul>{fields.map((field,index)=><li key={index}>{field}</li>)}</ul>}</div></div>
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state" role="status"><Search size={28}/><h3>{title}</h3><p>{description}</p>{action}</div>
}
export function AccessDenied({ security }: { security?: () => void }) {
  return <section className="surface-card state-card"><LockKeyhole size={32}/><h2>Access unavailable</h2><p>Your account does not have access to this area. Contact your administrator if you need a different assignment.</p>
    {security && <button className="button primary" onClick={security}>Account & security</button>}</section>
}
export function ResourceState({ loading, error, retry, security, children }: { loading: boolean; error?: unknown; retry: () => void; security?: () => void; children: ReactNode }) {
  if (loading) return <section className="surface-card state-card" aria-busy="true"><p role="status">Loading…</p><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></section>
  if (error instanceof ApiError && error.status===403) return <section className="surface-card state-card"><LockKeyhole size={32}/><h2>{error.code==='mfa_required'?'Additional verification required':'Access unavailable'}</h2><p>{error.message}</p>
    {error.code==='mfa_required'&&security ? <button className="button primary" onClick={security}>Set up two-step verification</button> : <button className="button outline" onClick={retry}>Check access again</button>}</section>
  if (error) return <section className="surface-card state-card"><ErrorNotice error={error}/><button className="button outline" onClick={retry}>Try again</button></section>
  return children
}
