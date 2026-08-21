import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { NETWORKS, truncateAddress, formatCrypto, fetchX402History } from '../utils/x402'
import { getBalance, getTransactions, addMoney } from '../utils/wallet'

const QUICK_USDC = [5, 10, 25, 50]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function WalletPage() {
  const { user } = useAuth()
  const {
    isConnected,
    address,
    network,
    usdcBalance,
    ethBalance,
    activeNetworkObj,
    openWalletModal,
    switchNetwork,
    requestFaucet,
    executeX402Payment,
    disconnectWallet,
  } = useWallet()

  const [inAppBalance, setInAppBalance] = useState(getBalance)
  const [localTxList, setLocalTxList] = useState(getTransactions)
  const [backendHistory, setBackendHistory] = useState([])
  const [topupAmount, setTopupAmount] = useState('10')
  const [status, setStatus] = useState('idle') // 'idle' | 'processing' | 'success'
  const [statusMsg, setStatusMsg] = useState('')
  const [faucetNotice, setFaucetNotice] = useState(false)
  const [copied, setCopied] = useState(false)

  // Playground tester state
  const [playgroundStatus, setPlaygroundStatus] = useState('idle')
  const [playgroundResult, setPlaygroundResult] = useState(null)

  useEffect(() => {
    if (user?.accessToken) {
      fetchX402History(user.accessToken).then((data) => {
        if (data && Array.isArray(data)) {
          setBackendHistory(data)
        }
      })
    }
  }, [user?.accessToken, status])

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFaucet = () => {
    requestFaucet(25)
    setFaucetNotice(true)
    setTimeout(() => setFaucetNotice(false), 2000)
  }

  // Settle Top-up via x402
  const handleX402Topup = async (e) => {
    e.preventDefault()
    const num = Number(topupAmount)
    if (num <= 0 || status === 'processing') return

    if (!isConnected || !address) {
      openWalletModal()
      return
    }

    if (usdcBalance < num) {
      setStatusMsg(`Insufficient USDC in wallet. Please use the +25 USDC Faucet.`)
      return
    }

    setStatus('processing')
    setStatusMsg('Signing x402 payment authorization…')

    try {
      const settlement = await executeX402Payment({
        plan: 'WALLET_TOPUP',
        amount: num,
        purpose: 'WALLET_TOPUP',
        userToken: user?.accessToken,
        onProgress: ({ message }) => setStatusMsg(message),
      })

      // Credit in-app balance (1 USDC = ₹80 approx in-app credits)
      const inrEquiv = Math.round(num * 80)
      const tx = addMoney(inrEquiv, `x402 (${activeNetworkObj.shortName} USDC)`)
      setInAppBalance(tx.balanceAfter)
      setLocalTxList(getTransactions())

      setStatus('success')
      setStatusMsg(`Successfully credited ${num} USDC (~₹${inrEquiv}) to your account!`)
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      console.error('Top-up error:', err)
      setStatus('idle')
      setStatusMsg(err.message || 'Top-up failed.')
    }
  }

  // Interactive Testnet x402 Micropayment Playground
  const handleTestMicropay = async () => {
    setPlaygroundStatus('processing')
    setPlaygroundResult(null)

    try {
      const settlement = await executeX402Payment({
        plan: 'SCAN_MICRO',
        amount: 0.1,
        purpose: 'ON_DEMAND_SCAN',
        userToken: user?.accessToken,
      })

      setPlaygroundResult(settlement)
      setPlaygroundStatus('success')
    } catch (err) {
      setPlaygroundResult({ error: err.message })
      setPlaygroundStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
      {/* Header */}
      <div>
        <p className="tag-tab text-xs text-cyan mb-2">ACCOUNT · WALLET &amp; X402</p>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink">
          Wallet &amp; X402 Protocol
        </h1>
        <p className="text-sm text-inkSoft mt-1">
          Manage your connected Web3 crypto wallet, top up in-app balance, and track tamper-evident audit receipts.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 1. Web3 Wallet Card */}
        <div className="border border-graphite/30 rounded-2xl bg-paperDark p-6 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="tag-tab text-[10px] text-cyan font-semibold">
                WEB3 WALLET INTEGRATION
              </span>
              <span className="tag-tab text-[10px] text-graphite">
                {activeNetworkObj.name}
              </span>
            </div>

            {isConnected ? (
              <div className="mt-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-paper border border-graphite/25">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="tag-tab text-xs font-mono text-ink">
                        {truncateAddress(address, 8, 6)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="tag-tab text-[11px] text-cyan hover:underline"
                    >
                      {copied ? 'COPIED ✓' : 'COPY'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t hairline">
                    <div>
                      <span className="tag-tab text-[9px] text-graphite">USDC BALANCE</span>
                      <p className="font-display text-2xl font-semibold text-cyan">
                        {formatCrypto(usdcBalance, 'USDC')}
                      </p>
                    </div>
                    <div>
                      <span className="tag-tab text-[9px] text-graphite">GAS ASSET</span>
                      <p className="font-display text-2xl font-semibold text-ink">
                        {ethBalance.toFixed(3)} {activeNetworkObj.chainId === 'solana' ? 'SOL' : 'ETH'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Network switcher & Faucet */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleFaucet}
                    className="tag-tab text-xs font-semibold px-3 py-2 rounded-lg bg-cyanSoft/40 text-cyan border border-cyan/40 hover:bg-cyanSoft/70 transition-colors"
                  >
                    {faucetNotice ? '+25 USDC Added!' : '+25 Testnet USDC'}
                  </button>

                  <button
                    type="button"
                    onClick={openWalletModal}
                    className="tag-tab text-xs px-3 py-2 rounded-lg border border-graphite/30 text-inkSoft hover:text-ink hover:bg-mist transition-colors"
                  >
                    Switch Network ⚙
                  </button>

                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className="tag-tab text-xs px-3 py-2 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-6">
                <div className="w-12 h-12 rounded-full bg-cyanSoft/40 text-cyan text-2xl flex items-center justify-center mx-auto mb-3">
                  ⚡
                </div>
                <h4 className="font-display text-base font-semibold text-ink">
                  No Web3 Wallet Connected
                </h4>
                <p className="text-xs text-inkSoft mt-1 max-w-xs mx-auto">
                  Connect MetaMask, Coinbase, Phantom, or start with an instant Devnet sandbox wallet.
                </p>
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="mt-4 tag-tab text-xs font-semibold px-5 py-2.5 rounded-full bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 shadow-glow transition-opacity"
                >
                  Connect Web3 Wallet →
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t hairline flex items-center justify-between text-xs text-inkSoft">
            <span>x402 Version: 1.0</span>
            <span className="text-cyan font-semibold">Active &amp; Ready</span>
          </div>
        </div>

        {/* 2. In-App Balance & Top-up via x402 */}
        <div className="border border-graphite/30 rounded-2xl bg-paperDark p-6 shadow-soft">
          <span className="tag-tab text-[10px] text-graphite font-semibold">
            IN-APP SCAN CREDITS
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-display text-3xl font-semibold tracking-tight text-ink">
              ₹{inAppBalance.toLocaleString('en-IN')}
            </p>
            <span className="tag-tab text-xs text-inkSoft">
              ≈ {(inAppBalance / 80).toFixed(2)} USDC
            </span>
          </div>

          <form onSubmit={handleX402Topup} className="mt-5 space-y-4 pt-4 border-t hairline">
            <span className="tag-tab text-[10px] text-graphite">TOP UP VIA X402 (USDC)</span>

            <div className="flex flex-wrap gap-2">
              {QUICK_USDC.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setTopupAmount(String(q))}
                  className={`tag-tab text-xs px-3.5 py-1.5 rounded-lg border transition-all ${
                    Number(topupAmount) === q
                      ? 'bg-gradient-to-r from-violet to-cyan text-paper border-transparent shadow-sm'
                      : 'border-graphite/35 text-ink hover:bg-mist'
                  }`}
                >
                  {q} USDC
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Custom USDC"
                className="flex-1 border border-graphite/35 rounded-lg bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
              />
              <button
                type="submit"
                disabled={status === 'processing'}
                className="tag-tab text-xs font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap shadow-glow"
              >
                {status === 'processing' ? 'SETTLING…' : `+ TOP UP ${topupAmount} USDC →`}
              </button>
            </div>

            {statusMsg && (
              <p
                className={`text-xs p-2 rounded-lg ${
                  status === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-cyanSoft/40 text-cyan'
                }`}
              >
                {statusMsg}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* 3. X402 Protocol Test Playground / Machine Sandbox */}
      <div className="border border-graphite/30 rounded-2xl bg-paperDark p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyanSoft/50 text-cyan text-[10px] font-semibold tag-tab mb-1">
              <span>⚡</span> DEVELOPER HARNESS
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">
              x402 Micropayment Playground
            </h3>
            <p className="text-xs text-inkSoft mt-0.5">
              Simulate an autonomous AI agent or client application paying 0.10 USDC for an on-demand scan.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestMicropay}
            disabled={playgroundStatus === 'processing'}
            className="tag-tab text-xs font-semibold px-4 py-2.5 rounded-xl bg-ink text-paper hover:bg-inkSoft transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <span>⚡</span>
            {playgroundStatus === 'processing' ? 'RUNNING HANDSHAKE…' : 'TEST 0.10 USDC SCAN →'}
          </button>
        </div>

        {/* Playground Result Display */}
        {playgroundResult && (
          <div className="mt-4 p-4 rounded-xl bg-paper border border-graphite/30 text-xs font-mono overflow-x-auto space-y-2">
            <div className="flex items-center justify-between text-ink">
              <span className="tag-tab text-[10px] text-cyan font-bold">X402 HANDSHAKE RESULT</span>
              <span className={playgroundResult.error ? 'text-red-500' : 'text-emerald-500 font-bold'}>
                {playgroundResult.error ? 'FAILED' : '200 OK · SETTLED'}
              </span>
            </div>
            {playgroundResult.error ? (
              <p className="text-red-600 font-sans">{playgroundResult.error}</p>
            ) : (
              <div className="space-y-1 text-inkSoft">
                <p><span className="text-graphite">Order ID:</span> {playgroundResult.orderId}</p>
                <p><span className="text-graphite">Tx Hash:</span> {playgroundResult.txHash}</p>
                <p><span className="text-graphite">Network:</span> {playgroundResult.network}</p>
                <p><span className="text-graphite">Ledger Block Index:</span> #{playgroundResult.blockchainReceipt?.block_index}</p>
                <p><span className="text-graphite">Ledger Block Hash:</span> {playgroundResult.blockchainReceipt?.block_hash}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Verified Blockchain Transaction Ledger */}
      <div className="border border-graphite/30 rounded-2xl bg-paperDark overflow-hidden shadow-soft">
        <div className="px-6 py-3.5 border-b hairline flex items-center justify-between bg-paper/60">
          <span className="tag-tab text-[11px] font-semibold text-graphite">
            IMMUTABLE BLOCKCHAIN AUDIT LEDGER
          </span>
          <span className="tag-tab text-[10px] text-cyan">
            {backendHistory.length} On-Chain Records
          </span>
        </div>

        {backendHistory.length === 0 && localTxList.length === 0 ? (
          <p className="text-sm text-inkSoft px-6 py-8 text-center">
            No transactions yet. Complete a checkout or top-up to see verified blockchain records.
          </p>
        ) : (
          <div className="divide-y hairline">
            {/* Backend verified x402 records */}
            {backendHistory.map((tx) => (
              <div key={tx.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="tag-tab text-[10px] font-bold px-2 py-0.5 rounded bg-cyanSoft/50 text-cyan">
                      x402 {tx.network?.split(':')[0]?.toUpperCase() || 'EVM'}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {tx.plan === 'PREMIUM' ? '3-Month Plan Upgrade' : tx.plan}
                    </span>
                  </div>
                  <div className="text-xs text-inkSoft mt-1 space-x-2 font-mono">
                    <span>Tx: {truncateAddress(tx.txHash, 6, 4)}</span>
                    <span>·</span>
                    <span>Block #{tx.blockchainBlockIndex}</span>
                    <span>·</span>
                    <span>{formatDate(tx.settledAt || tx.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600 block">
                    +{tx.amount} {tx.asset}
                  </span>
                  <span className="tag-tab text-[9px] text-graphite uppercase font-semibold">
                    {tx.status} ✓
                  </span>
                </div>
              </div>
            ))}

            {/* Local in-app transactions */}
            {localTxList.map((tx) => (
              <div key={tx.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {tx.type === 'credit' ? 'In-App Credit' : tx.method}
                  </p>
                  <p className="text-xs text-inkSoft mt-0.5">
                    {tx.method} · {formatDate(tx.timestamp)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-high'}`}>
                  {tx.type === 'credit' ? '+' : '−'}₹{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center pt-2">
        <Link
          to="/subscription"
          className="tag-tab text-[11px] text-inkSoft hover:text-ink underline underline-offset-2 transition-colors"
        >
          BACK TO BILLING OVERVIEW
        </Link>
      </p>
    </div>
  )
}
