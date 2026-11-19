import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, LogIn } from 'lucide-react'
import { Modal } from '../components/ui'
import { terminals } from './terminalData'
import type { Terminal } from './terminalData'
import './terminal-landing.css'

export function TerminalLanding({ onSelect, onSignIn }: {
  onSelect: (terminal: Terminal) => void
  onSignIn: () => void
}) {
  const [pending, setPending] = useState<Terminal | null>(null)
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'Spartial HMS · Terminal Landing Page'
    main.current?.focus({ preventScroll: true })
  }, [])

  return <div className="terminal-landing">
    <a className="skip-link" href="#terminal-list" onClick={event => {
      event.preventDefault()
      document.getElementById('terminal-list')?.focus()
    }}>Skip to terminals</a>

    <header className="terminal-header">
      <div className="terminal-header-inner">
        <img className="terminal-logo" src="/spartial-logo.jpg" alt="Spartial Specialized Polyclinic" width={168} height={96}/>
        <div className="terminal-heading">
          <h1>Spartial HMS Landing Page</h1>
          <p>Your clinic. One connected workspace.</p>
        </div>
        <button className="terminal-sign-in" type="button" onClick={onSignIn}><LogIn size={16} aria-hidden="true"/>Staff sign in</button>
      </div>
    </header>

    <main ref={main} className="terminal-main" id="main-content" tabIndex={-1}>
      <div className="terminal-intro">
        <p>Select a terminal to continue</p>
        <span className="terminal-demo-badge"><span aria-hidden="true"/>Demo Mode</span>
      </div>
      <section className="terminal-grid" id="terminal-list" aria-label="Clinic terminals" tabIndex={-1}>
        {terminals.map((terminal, index) => <article className="terminal-card" key={terminal.id} data-terminal-id={terminal.id} aria-labelledby={`terminal-${terminal.id}`}>
          <div className="terminal-photo" aria-hidden="true" style={{
            '--photo-x': `${(index % 3) * 50}%`,
            '--photo-y': `${Math.floor(index / 3) * (100 / 3)}%`,
          } as CSSProperties}/>
          <div className="terminal-card-content">
            <h2 id={`terminal-${terminal.id}`}>{terminal.title}</h2>
            <p>{terminal.description}</p>
            <div className="terminal-card-footer">
              <button className="terminal-open" type="button" onClick={() => {
                if (terminal.screen) onSelect(terminal)
                else setPending(terminal)
              }}>{terminal.action}<ArrowRight size={13} aria-hidden="true"/></button>
              {!terminal.screen && <span className="terminal-pending">Design pending</span>}
            </div>
          </div>
        </article>)}
      </section>
      <footer className="terminal-footer"><span>Spartial Specialized Polyclinic</span><p>Demonstration workspace · Fictional records only</p></footer>
    </main>

    {pending && <Modal title={pending.title} subtitle="Design preview · Workflow not yet implemented" close={() => setPending(null)}>
      <div className="modal-form terminal-pending-dialog">
        <p>{pending.description}</p>
        <p>This terminal is included in the navigation design. Its clinical requirements and API contracts still need approval before a working module can be added.</p>
        <button data-initial-focus className="button primary" type="button" onClick={() => setPending(null)}>Back to terminals</button>
      </div>
    </Modal>}
  </div>
}
