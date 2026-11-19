import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(_error:Error,_info:ErrorInfo){ /* React reports the error to development tools. Do not log record contents. */ }
  render(){return this.state.failed?<main className="state-card" role="alert"><h1>The workspace could not be displayed</h1><p>Reload to return to the entry screen. In-memory demonstration changes will be lost.</p><button className="button primary" onClick={()=>location.reload()}>Reload workspace</button></main>:this.props.children}
}
