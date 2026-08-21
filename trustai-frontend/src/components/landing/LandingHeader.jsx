import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../Logo'
import Wordmark from '../Wordmark'
import UserMenu from '../UserMenu'
import { useAuth } from '../../context/AuthContext'
import { useWallet } from '../../context/WalletContext'
import { truncateAddress } from '../../utils/x402'

const MEGA_MENUS = {
  tools: {
    label: 'Verification Tools',
    columns: [
      {
        heading: 'Run a check',
        items: [
          { title: 'Document Check', desc: 'Metadata, OCR & layout analysis for scans and PDFs', href: '/check' },
          { title: 'Image Forensics', desc: 'Error Level Analysis to surface localized edits', href: '/check' }
        ]
      },
      {
        heading: 'In beta',
        items: [
          { title: 'Deepfake Detection', desc: 'Face and voice synthesis screening', href: '/check' },
          { title: 'Signature Verification', desc: 'Cross-reference signatures across a case', href: '/check' }
        ]
      }
    ]
  },
  cases: {
    label: 'Case Management',
    columns: [
      {
        heading: 'Track your work',
        items: [
          { title: 'History Log', desc: 'Every check you’ve run, searchable by case number', href: '/history' },
          { title: 'Team Workspaces', desc: 'Shared queues and reviewer sign-off', href: '/history' }
        ]
      }
    ]
  },
  orgs: {
    label: 'Organizations',
    columns: [
      {
        heading: 'Built for your team',
        items: [
          { title: 'Newsrooms & Journalists', desc: 'Verify source media before it runs', href: '#audiences' },
          { title: 'Universities & Admissions', desc: 'Catch altered transcripts and marksheets', href: '#audiences' },
          { title: 'HR & Recruiting', desc: 'Screen credentials without slowing offers', href: '#audiences' },
          { title: 'Legal & Insurance', desc: 'Build a defensible evidence trail', href: '#audiences' }
        ]
      }
    ]
  }
}

function MegaMenuPanel({ menu }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-40">
      <div className="w-[560px] max-w-[90vw] bg-paperDark rounded-2xl shadow-softLg border border-ink/[0.08] p-6 grid grid-cols-2 gap-6">
        {menu.columns.map((col) => (
          <div key={col.heading}>
            <p className="tag-tab text-[10px] text-graphite mb-3">{col.heading.toUpperCase()}</p>
            <div className="space-y-3.5">
              {col.items.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="block group/item"
                >
                  <p className="font-semibold text-sm text-ink group-hover/item:text-seal transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-inkSoft mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingHeader() {
  const [openMenu, setOpenMenu] = useState(null)
  const closeTimer = useRef(null)
  const { user, logout } = useAuth()
  const { isConnected, address, usdcBalance, openWalletModal } = useWallet()
  const navigate = useNavigate()

  const open = useCallback((key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenMenu(key)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b border-ink/[0.08]">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo size={30} />
          <Wordmark height={16} />
        </Link>

        <nav className="hidden lg:flex items-center gap-1" onMouseLeave={scheduleClose}>
          {Object.entries(MEGA_MENUS).map(([key, menu]) => (
            <div key={key} className="relative" onMouseEnter={() => open(key)}>
              <button
                className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  openMenu === key ? 'text-ink bg-mist' : 'text-inkSoft hover:text-ink hover:bg-mist'
                }`}
                aria-expanded={openMenu === key}
              >
                {menu.label}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className={`transition-transform ${openMenu === key ? 'rotate-180' : ''}`}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openMenu === key && <MegaMenuPanel menu={menu} />}
            </div>
          ))}
          <Link to="/pricing" className="px-3.5 py-2 rounded-full text-sm font-medium text-inkSoft hover:text-ink hover:bg-mist transition-colors">
            Plans
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={openWalletModal}
            className={`tag-tab text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
              isConnected
                ? 'border-cyan/50 bg-cyanSoft/40 text-ink hover:border-cyan'
                : 'border-ink/[0.12] text-inkSoft hover:border-cyan/60 hover:text-ink'
            }`}
            title={isConnected ? `Connected: ${address} (${usdcBalance} USDC)` : 'Connect Web3 Wallet'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{truncateAddress(address, 4, 3)}</span>
                <span className="text-[10px] text-cyan font-mono font-semibold">
                  {usdcBalance.toFixed(0)} USDC
                </span>
              </>
            ) : (
              <>
                <span className="text-cyan">⚡</span>
                <span>X402 WALLET</span>
              </>
            )}
          </button>

          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </div>
    </header>
  )
}
