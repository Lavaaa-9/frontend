import { ApiWorkspace } from './app/ApiWorkspace'

// The legacy adapter is retained for review, but is gated until the new
// backend contract and its CSRF protection are implemented and verified.
export default function App() {
  return <ApiWorkspace />
}
