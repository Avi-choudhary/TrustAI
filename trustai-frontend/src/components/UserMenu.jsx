import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { PLAN_BADGE, getInitials } from '../utils/subscription'

// Icons kept as small inline SVGs (1.8 stroke, 24 viewBox) to match the
// existing icon style used elsewhere in the app (ThemeToggle, PricingPage).
const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  bookmark: <path d="M7 4h10a1 1 0 011 1v15l-6-3.5L6 20V5a1 1 0 011-1z" />,
  diamond: <path d="M4 9l4-5h8l4 5-10 11L4 9z" />,
  wallet: (
    <>
      <path d="M20 7H5a2 2 0 00-2 2v8a2 2 0 002 2h15a1 1 0 001-1V8a1 1 0 00-1-1z" />
      <path d="M16 11h5v4h-5a2 2 0 110-4z" />
      <path d="M18 13h.01" />
      <path d="M5 7V5a2 2 0 012-2h10" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  signOut: (
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  signIn: (
    <>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4.4 3.6-7 8-7 1.5 0 2.9.31 4 .87M19 8v6M22 11h-6" />
    </>
  ),
  userGeneric: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7v1H4v-1z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
}

function Icon({ path, className = '' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

function MenuItem({ icon, label, onClick, itemRef, accent }) {
  return (
    <button
      type="button"
      role="menuitem"
      ref={itemRef}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 text-left tag-tab text-xs px-3.5 py-2.5 transition-colors outline-none ${
        accent
          ? 'text-cyan hover:bg-cyanSoft/50 focus-visible:bg-cyanSoft/50 font-semibold'
          : 'text-inkSoft hover:bg-mist hover:text-ink focus-visible:bg-mist focus-visible:text-ink'
      }`}
    >
      <Icon path={ICONS[icon]} />
      {label}
    </button>
  )
}

// Full account menu, shown once signed in.
const ACCOUNT_ITEMS = [
  { key: 'new-check', icon: 'plus', label: 'NEW CHECK', path: '/check' },
  { key: 'history', icon: 'clock', label: 'HISTORY LOG', path: '/history' },
  { key: 'saved', icon: 'bookmark', label: 'SAVED REPORTS', path: '/saved-reports' },
  { key: 'subscription', icon: 'diamond', label: 'SUBSCRIPTION', path: '/subscription', accent: true },
  { key: 'wallet', icon: 'wallet', label: 'WALLET', path: '/wallet' },
  { key: 'settings', icon: 'gear', label: 'SETTINGS', path: '/settings' }
]

// Reduced menu for signed-out visitors — same button and dropdown shell,
// just pointed at auth instead of account tools.
const GUEST_ITEMS = [
  { key: 'sign-in', icon: 'signIn', label: 'SIGN IN', path: '/login', accent: true },
  { key: 'create-account', icon: 'userPlus', label: 'CREATE ACCOUNT', path: '/signup' }
]

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const firstItemRef = useRef(null)
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const isGuest = !user
  const plan = PLAN_BADGE[user?.plan] || PLAN_BADGE.FREE
  const initials = !isGuest ? getInitials(user?.name, user?.email) : null
  const items = isGuest ? GUEST_ITEMS : ACCOUNT_ITEMS

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      // Move focus into the menu once it opens, so keyboard users land
      // straight on the first actionable item.
      const id = requestAnimationFrame(() => firstItemRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const handleKeyDown = (e) => {
    if (!open || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    const focusable = menuRef.current?.querySelectorAll('[role="menuitem"], [role="switch"]')
    if (!focusable || focusable.length === 0) return
    e.preventDefault()
    const list = Array.from(focusable)
    const currentIndex = list.indexOf(document.activeElement)
    const nextIndex =
      e.key === 'ArrowDown' ? (currentIndex + 1) % list.length : (currentIndex - 1 + list.length) % list.length
    list[nextIndex].focus()
  }

  const goTo = (path) => {
    setOpen(false)
    navigate(path)
  }

  const handleSignOut = () => {
    setOpen(false)
    onLogout?.()
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={isGuest ? 'Account — signed out' : 'Account menu'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-soft ${
          isGuest
            ? 'bg-mistDark border border-graphite/50 text-inkSoft hover:border-cyan/60 hover:text-ink'
            : 'bg-gradient-to-br from-violet to-cyan text-paper text-[11px] font-semibold tag-tab hover:opacity-90'
        }`}
      >
        {isGuest ? <Icon path={ICONS.userGeneric} /> : initials}
      </button>

      <div
        ref={menuRef}
        role="menu"
        aria-hidden={!open}
        onKeyDown={handleKeyDown}
        className={`absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-paperDark border border-graphite/25 rounded-sm shadow-softLg py-1.5 z-40 origin-top-right transition-all duration-150 ease-out ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-3.5 py-3 border-b hairline">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isGuest
                ? 'bg-mistDark border border-graphite/50 text-inkSoft'
                : 'bg-gradient-to-br from-violet to-cyan text-paper text-[11px] font-semibold tag-tab'
            }`}
          >
            {isGuest ? <Icon path={ICONS.userGeneric} /> : initials}
          </span>
          {isGuest ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">You're not signed in</p>
              <p className="text-xs text-inkSoft mt-0.5 leading-relaxed">
                Sign in to run checks and see your history.
              </p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate" title={user?.name || user?.username}>
                {user?.name || user?.username}
              </p>
              <p className="tag-tab text-[10px] text-graphite truncate mt-0.5" title={user?.email}>
                {user?.email}
              </p>
              <span className={`inline-block tag-tab text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1.5 ${plan.classes}`}>
                {plan.label}
              </span>
            </div>
          )}
        </div>

        {/* Navigation / auth options */}
        <div className="py-1">
          {items.map((item, i) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              accent={item.accent}
              onClick={() => goTo(item.path)}
              itemRef={i === 0 ? firstItemRef : undefined}
            />
          ))}
        </div>

        {/* Appearance — available whether signed in or not */}
        <div className="border-t hairline py-1">
          <div className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5">
            <span className="flex items-center gap-2.5 tag-tab text-xs text-inkSoft">
              <Icon path={isDark ? ICONS.moon : ICONS.sun} />
              DARK MODE
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-1 ${
                isDark ? 'bg-gradient-to-r from-violet to-cyan' : 'bg-graphite/30'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-paper shadow-soft transition-transform ${
                  isDark ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sign out — only when signed in */}
        {!isGuest && (
          <div className="border-t hairline pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 text-left tag-tab text-xs px-3.5 py-2.5 text-high hover:bg-highSoft transition-colors focus-visible:bg-highSoft outline-none"
            >
              <Icon path={ICONS.signOut} />
              SIGN OUT
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

