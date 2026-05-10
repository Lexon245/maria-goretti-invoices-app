import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Bootstrap.css'
import Bootstrap from './Bootstrap.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Pre-Bootstrap noop shim so anything that touches window.electron.db before
// Bootstrap finishes wiring it (e.g., during module init) doesn't crash.
// Bootstrap will overwrite this shim with a real engine binding once the
// SQLite WASM is initialised in web mode. In Electron mode the preload
// script writes the real bridge before this script runs, so the guard skips.
if (!window.electron?.db?.query) {
  const noop = async () => [];
  window.electron = {
    db: {
      query: noop,
      run: async () => ({ changes: 0, lastInsertRowid: 0 }),
      transaction: async () => [],
    },
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Bootstrap />
    </ErrorBoundary>
  </StrictMode>,
)
