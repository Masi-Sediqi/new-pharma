import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Application render failed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5 text-slate-950">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-5 shadow-lg">
          <h1 className="text-lg font-extrabold text-red-600">System could not load</h1>
          <p className="mt-2 text-sm text-slate-600">A temporary loading error happened. Try reloading once.</p>
          <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">{this.state.error?.message}</pre>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 h-10 rounded-lg bg-[#172a57] px-4 text-sm font-bold text-white">
            Reload
          </button>
        </div>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)

const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)

if ('serviceWorker' in navigator && !isLocalHost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}

if ('serviceWorker' in navigator && isLocalHost) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  }).catch((error) => {
    console.error('Service worker cleanup failed:', error)
  })
}
