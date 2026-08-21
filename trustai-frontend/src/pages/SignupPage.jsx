import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import AccessStamp from '../components/AccessStamp'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', org: '', password: '', confirm: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | granted
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    if (form.password !== form.confirm) {
      setError('Passwords don\u2019t match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password should be at least 8 characters.')
      return
    }
    setError(null)
    setStatus('submitting')

    try {
      // 1. Register with backend
      const regResp = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      })

      const regData = await regResp.json()
      if (!regResp.ok) {
        throw new Error(regData.detail || 'Registration failed.')
      }

      // 2. Automatically log in to get access token
      const loginResp = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      })

      const loginData = await loginResp.json()
      if (!loginResp.ok) {
        throw new Error(loginData.detail || 'Login after registration failed.')
      }

      login(
        {
          name: form.name,
          email: form.email,
          plan: 'FREE',
        },
        loginData.access_token
      )

      setStatus('granted')
      setTimeout(() => navigate('/check'), 900)
    } catch (err) {
      console.error('Registration error:', err)
      setStatus('idle')
      setError(err.message || 'Unable to complete registration.')
    }
  }

  if (status === 'granted') {
    return (
      <AuthLayout eyebrow="ANALYST REGISTRATION" title="You're registered">
        <AccessStamp label="CASE FILE OPENED" sub="REDIRECTING…" />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="ANALYST REGISTRATION"
      title="Create your registry account"
      subtitle="Free for individual checks. Organizations can add teammates later."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <span className="tag-tab text-[10px] text-graphite">ORGANIZATION (OPTIONAL)</span>
          <input
            value={form.org}
            onChange={update('org')}
            placeholder="Newsroom, agency, or institution"
            className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
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
          <label className="block">
            <span className="tag-tab text-[10px] text-graphite">CONFIRM</span>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="••••••••"
              className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-high font-medium" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3 rounded-sm hover:opacity-90 shadow-glow transition-colors disabled:opacity-60"
        >
          {status === 'submitting' ? 'OPENING CASE FILE…' : 'CREATE ACCOUNT →'}
        </button>
      </form>

      <p className="text-sm text-inkSoft mt-6 text-center">
        Already registered?{' '}
        <Link to="/login" className="text-cyan font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
