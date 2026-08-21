import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import Wordmark from './Wordmark'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { truncateAddress } from '../utils/x402'

export default function Navbar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { isConnected, address, usdcBalance, activeNetworkObj, openWalletModal } = useWallet()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const linkClass = (path) =>
    `tag-tab text-xs px-3 py-1.5 rounded-sm border transition-colors ${
      location.pathname === path
        ? 'bg-gradient-to-r from-violet to-cyan text-paper border-transparent font-semibold'
        : 'border-graphite/40 text-inkSoft hover:border-cyan/60 hover:text-ink'
    }`

  return (
    <header className="border-b border-graphite/25 bg-paper/85 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo size={32} className="shadow-glow rounded-full" />
          <div className="leading-tight">
            <Wordmark height={13} />
            <div className="tag-tab text-[10px] text-graphite mt-1">DOCUMENT &amp; MEDIA VERIFICATION</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/check" className={linkClass('/check')}>NEW CHECK</Link>
          <Link to="/history" className={linkClass('/history')}>HISTORY LOG</Link>
          <Link to="/pricing" className={linkClass('/pricing')}>PRICING</Link>
          
          {/* Web3 / x402 Wallet Button */}
          <button
            type="button"
            onClick={openWalletModal}
            className={`tag-tab text-xs px-3 py-1.5 rounded-sm border flex items-center gap-1.5 transition-all ${
              isConnected
                ? 'border-cyan/50 bg-cyanSoft/40 text-ink hover:border-cyan hover:bg-cyanSoft/70'
                : 'border-graphite/40 text-inkSoft hover:border-cyan/60 hover:text-ink'
            }`}
            title={isConnected ? `Connected: ${address} (${usdcBalance} USDC)` : 'Connect Web3 Wallet'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{truncateAddress(address, 4, 3)}</span>
                <span className="text-[10px] text-cyan font-mono font-semibold hidden sm:inline">
                  {usdcBalance.toFixed(0)} USDC
                </span>
              </>
            ) : (
              <>
                <span className="text-cyan">⚡</span>
                <span className="hidden sm:inline">X402</span> WALLET
              </>
            )}
          </button>

          <span className="w-px h-5 bg-graphite/30 mx-1.5" aria-hidden="true" />
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link
                to="/login"
                className="tag-tab text-xs px-3 py-1.5 rounded-sm border border-graphite/40 text-inkSoft hover:border-cyan/60 hover:text-ink transition-colors"
              >
                SIGN IN
              </Link>
              <Link
                to="/signup"
                className="tag-tab text-xs px-3 py-1.5 rounded-sm bg-gradient-to-r from-seal to-medium text-paper font-semibold hover:opacity-90 transition-opacity"
              >
                REGISTER
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
