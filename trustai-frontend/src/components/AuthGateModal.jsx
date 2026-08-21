import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import Wordmark from './Wordmark'

// Shown as an overlay whenever a signed-out visitor lands on a route that
// requires an account (see ProtectedRoute in App.jsx). Login and signup are
// both handled inline so the popup itself satisfies the "must sign in or
// sign up to proceed" requirement without bouncing the user to another page.
export default function AuthGateModal({ onClose }) {
  const { login } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const switchMode = (next) => {
    setMode(next)
    setError(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup') {
      if (!form.name || !form.email || !form.password) return
      if (form.password !== form.confirm) {
        setError('Passwords don\u2019t match.')
        return
      }
      if (form.password.length < 8) {
        setError('Password should be at least 8 characters.')
        return
      }
    } else if (!form.email || !form.password) {
      return
    }

    setSubmitting(true)
    // UI-only for now, same fake-delay pattern as LoginPage/SignupPage —
    // swap for a real API call once an auth backend exists.
    setTimeout(() => {
      login({ name: form.name, email: form.email })
      setSubmitting(false)
    }, 600)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      <div className="relative w-full max-w-sm bg-paperDark border border-graphite/25 rounded-sm shadow-softLg p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-inkSoft hover:text-ink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Logo size={28} />
          <Wordmark height={13} />
        </div>

        <p className="tag-tab text-xs text-cyan mb-1.5">ANALYST ACCESS</p>
        <h2 id="auth-gate-title" className="font-display text-xl font-semibold tracking-tight text-ink">
          Sign in to run a check
        </h2>
        <p className="text-inkSoft mt-2 text-sm leading-relaxed">
          Verification results are tied to your registry account, so sign in or create one to continue.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-sm bg-mist/40 border border-graphite/20">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`tag-tab text-[11px] py-2 rounded-sm transition-colors ${
              mode === 'login' ? 'bg-gradient-to-r from-violet to-cyan text-paper font-semibold' : 'text-inkSoft hover:text-ink'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`tag-tab text-[11px] py-2 rounded-sm transition-colors ${
              mode === 'signup' ? 'bg-gradient-to-r from-violet to-cyan text-paper font-semibold' : 'text-inkSoft hover:text-ink'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-5">
          {mode === 'signup' && (
            <label className="block">
              <span className="tag-tab text-[10px] text-graphite">FULL NAME</span>
              <input
                required
                value={form.name}
                onChange={update('name')}
                placeholder="Jordan Ade"
                className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
              />
            </label>
          )}

          <label className="block">
            <span className="tag-tab text-[10px] text-graphite">EMAIL</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              placeholder="you@organization.com"
              className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
            />
          </label>

          <label className="block">
            <span className="tag-tab text-[10px] text-graphite">PASSWORD</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••"
              className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
            />
          </label>

          {mode === 'signup' && (
            <label className="block">
              <span className="tag-tab text-[10px] text-graphite">CONFIRM PASSWORD</span>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={update('confirm')}
                placeholder="••••••••"
                className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
              />
            </label>
          )}

          {error && (
            <p className="text-sm text-high font-medium" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3 rounded-sm hover:opacity-90 shadow-glow transition-colors disabled:opacity-60"
          >
            {submitting ? 'VERIFYING…' : mode === 'login' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        <p className="text-xs text-inkSoft mt-5 text-center">
          Prefer a full page?{' '}
          <Link to={mode === 'login' ? '/login' : '/signup'} className="text-cyan font-medium hover:underline">
            {mode === 'login' ? 'Go to sign in' : 'Go to registration'}
          </Link>
        </p>
      </div>
    </div>
  )
}
