import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import AccessStamp from '../components/AccessStamp'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { login } = useAuth()

  const update = (field) => (e) => {
    setForm((f) => ({
      ...f,
      [field]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      return
    }

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Invalid email or password'
        )
      }

      login(
        {
          email: form.email,
        },
        data.access_token
      )

      setStatus('granted')

      setTimeout(() => {
        navigate('/check')
      }, 900)
    } catch (err) {
      console.error('Login error:', err)

      setStatus('idle')
      setError(
        err.message || 'Unable to sign in'
      )
    }
  }

  if (status === 'granted') {
    return (
      <AuthLayout
        eyebrow="ANALYST ACCESS"
        title="Welcome back"
      >
        <AccessStamp
          label="ACCESS GRANTED"
          sub="REDIRECTING…"
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="ANALYST ACCESS"
      title="Sign in to your registry"
      subtitle="Review your verification history and run new checks."
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <label className="block">
          <span className="tag-tab text-[10px] text-graphite">
            EMAIL
          </span>

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
          <div className="flex items-baseline justify-between">
            <span className="tag-tab text-[10px] text-graphite">
              PASSWORD
            </span>

            <a
              href="#"
              className="tag-tab text-[10px] text-inkSoft hover:text-cyan transition-colors"
            >
              FORGOT?
            </a>
          </div>

          <input
            type="password"
            required
            value={form.password}
            onChange={update('password')}
            placeholder="••••••••"
            className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
          />
        </label>

        {error && (
          <div className="rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3 rounded-sm hover:opacity-90 shadow-glow transition-colors disabled:opacity-60"
        >
          {status === 'submitting'
            ? 'VERIFYING…'
            : 'SIGN IN →'}
        </button>
      </form>

      <p className="text-sm text-inkSoft mt-6 text-center">
        No registry account?{' '}
        <Link
          to="/signup"
          className="text-cyan font-medium hover:underline"
        >
          Register as an analyst
        </Link>
      </p>
    </AuthLayout>
  )
}