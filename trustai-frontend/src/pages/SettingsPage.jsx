import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <div className="border border-graphite/25 rounded-sm bg-paperDark/50 p-6">
      <p className="tag-tab text-[10px] text-graphite mb-1.5">{eyebrow}</p>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {description && <p className="text-sm text-inkSoft mt-1 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  )
}

function TextField({ label, defaultValue = '', type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="tag-tab text-[10px] text-graphite">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full border border-graphite/35 rounded-sm bg-paper/70 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan transition-colors"
      />
    </label>
  )
}

function ToggleRow({ label, description, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b hairline last:border-b-0">
      <div>
        <p className="text-sm text-ink">{label}</p>
        {description && <p className="text-xs text-inkSoft mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-1 ${
          on ? 'bg-gradient-to-r from-violet to-cyan' : 'bg-graphite/30'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-paper shadow-soft transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="mb-6">
        <p className="tag-tab text-xs text-cyan mb-2">ACCOUNT</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-inkSoft mt-1">Manage your profile, security, and notification preferences.</p>
      </div>

      <div className="space-y-5">
        <SectionCard eyebrow="PROFILE" title="Profile information">
          <form onSubmit={handleSaveProfile} className="grid sm:grid-cols-2 gap-4">
            <TextField label="FULL NAME" defaultValue={user?.name} />
            <TextField label="USERNAME" defaultValue={user?.username} />
            <TextField label="EMAIL" type="email" defaultValue={user?.email} />
            <TextField label="ORGANIZATION" placeholder="Optional" />
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                className="tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
              >
                SAVE CHANGES
              </button>
              {saved && <span className="text-sm text-low">Saved.</span>}
            </div>
          </form>
        </SectionCard>

        <SectionCard eyebrow="SECURITY" title="Password">
          <form className="grid sm:grid-cols-2 gap-4">
            <TextField label="CURRENT PASSWORD" type="password" placeholder="••••••••" />
            <div className="hidden sm:block" />
            <TextField label="NEW PASSWORD" type="password" placeholder="••••••••" />
            <TextField label="CONFIRM NEW PASSWORD" type="password" placeholder="••••••••" />
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="tag-tab text-xs font-semibold border border-graphite/40 text-inkSoft hover:border-cyan/60 hover:text-ink px-5 py-2.5 rounded-sm transition-colors"
              >
                UPDATE PASSWORD
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard eyebrow="PREFERENCES" title="Notifications">
          <div>
            <ToggleRow label="Email me when a check completes" description="Get notified as soon as results are ready." defaultOn />
            <ToggleRow label="Weekly summary" description="A digest of your verification activity." />
            <ToggleRow label="Product updates" description="New detection signals and feature announcements." />
          </div>
        </SectionCard>

        <SectionCard eyebrow="SECURITY" title="Two-factor authentication">
          <ToggleRow label="Require a code at sign-in" description="Adds an extra step when signing in from a new device." />
        </SectionCard>

        <SectionCard eyebrow="ACCOUNT" title="Danger zone">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-inkSoft">Permanently delete your account and all associated data.</p>
            <button
              type="button"
              className="tag-tab text-xs font-semibold text-high border border-high/40 hover:bg-highSoft px-5 py-2.5 rounded-sm transition-colors whitespace-nowrap"
            >
              DELETE ACCOUNT
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
