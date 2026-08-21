import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { NETWORKS, truncateAddress, formatCrypto } from '../utils/x402'

export default function WalletConnectModal() {
  const {
    isConnected,
    isModalOpen,
    closeWalletModal,
    address,
    network,
    usdcBalance,
    ethBalance,
    activeNetworkObj,
    connectInjectedWallet,
    connectPhantomWallet,
    connectDevnetWallet,
    disconnectWallet,
    switchNetwork,
    requestFaucet,
    isConnecting,
  } = useWallet()

  const [copied, setCopied] = useState(false)
  const [faucetSuccess, setFaucetSuccess] = useState(false)

  if (!isModalOpen) return null

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFaucet = () => {
    requestFaucet(25)
    setFaucetSuccess(true)
    setTimeout(() => setFaucetSuccess(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-paperDark border border-graphite/30 rounded-2xl shadow-softLg overflow-hidden text-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b hairline bg-paper/60">
          <div>
            <span className="tag-tab text-[10px] text-cyan font-semibold tracking-wider">
              X402 PROTOCOL · WEB3
            </span>
            <h3 className="font-display text-lg font-semibold text-ink">
              {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeWalletModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-inkSoft hover:text-ink hover:bg-mist transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Connected state */}
          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-paper to-paperDark border border-graphite/30">
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
                    className="tag-tab text-[11px] text-cyan hover:underline transition-colors"
                  >
                    {copied ? 'COPIED ✓' : 'COPY'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t hairline">
                  <div>
                    <span className="tag-tab text-[9px] text-graphite">USDC BALANCE</span>
                    <p className="font-display text-xl font-semibold text-cyan">
                      {formatCrypto(usdcBalance, 'USDC')}
                    </p>
                  </div>
                  <div>
                    <span className="tag-tab text-[9px] text-graphite">NETWORK ASSET</span>
                    <p className="font-display text-xl font-semibold text-ink">
                      {ethBalance.toFixed(3)} {activeNetworkObj.chainId === 'solana' ? 'SOL' : 'ETH'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Faucet button for instant testing */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-cyanSoft/30 border border-cyan/30">
                <div>
                  <p className="text-xs font-semibold text-ink">Need test USDC?</p>
                  <p className="text-[11px] text-inkSoft">Mint instant testnet funds for x402 checkout</p>
                </div>
                <button
                  type="button"
                  onClick={handleFaucet}
                  className="tag-tab text-xs font-semibold px-3 py-1.5 rounded-sm bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 shadow-sm transition-opacity"
                >
                  {faucetSuccess ? '+25 USDC Added!' : '+25 USDC Faucet'}
                </button>
              </div>

              {/* Network Selector */}
              <div>
                <span className="tag-tab text-[10px] text-graphite block mb-2">
                  ACTIVE BLOCKCHAIN NETWORK
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map((net) => {
                    const isSelected = network === net.id
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => switchNetwork(net.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-cyan bg-cyanSoft/40 font-semibold text-ink ring-1 ring-cyan/40'
                            : 'border-graphite/25 hover:border-graphite/50 text-inkSoft hover:text-ink'
                        }`}
                      >
                        <span className="text-base">{net.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs">{net.shortName}</p>
                          {net.badge && (
                            <span className="tag-tab text-[8px] text-cyan font-bold block">
                              {net.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Disconnect */}
              <button
                type="button"
                onClick={disconnectWallet}
                className="w-full tag-tab text-xs py-2.5 rounded-sm border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
              >
                DISCONNECT WALLET
              </button>
            </div>
          ) : (
            /* Disconnected provider options */
            <div className="space-y-3">
              <p className="text-xs text-inkSoft leading-relaxed">
                Connect your Web3 wallet to authorize x402 micropayments directly on Base, Ethereum, Polygon, or Solana.
              </p>

              {/* MetaMask / Injected */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => connectInjectedWallet('metamask')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-graphite/30 hover:border-cyan hover:bg-mist/80 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-xl">
                    🦊
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink group-hover:text-cyan transition-colors">
                      MetaMask / Browser Wallet
                    </p>
                    <p className="text-[11px] text-inkSoft">Injected window.ethereum</p>
                  </div>
                </div>
                <span className="tag-tab text-[10px] text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  CONNECT →
                </span>
              </button>

              {/* Coinbase Wallet */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => connectInjectedWallet('coinbase')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-graphite/30 hover:border-cyan hover:bg-mist/80 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-xl">
                    🔵
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink group-hover:text-cyan transition-colors">
                      Coinbase Wallet / Base
                    </p>
                    <p className="text-[11px] text-inkSoft">Native Base L2 Settlement</p>
                  </div>
                </div>
                <span className="tag-tab text-[10px] text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  CONNECT →
                </span>
              </button>

              {/* Phantom */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={connectPhantomWallet}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-graphite/30 hover:border-cyan hover:bg-mist/80 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center text-xl">
                    👻
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink group-hover:text-cyan transition-colors">
                      Phantom (Solana)
                    </p>
                    <p className="text-[11px] text-inkSoft">Solana USDC payments</p>
                  </div>
                </div>
                <span className="tag-tab text-[10px] text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  CONNECT →
                </span>
              </button>

              {/* Instant Devnet Sandbox Wallet */}
              <div className="pt-2 border-t hairline">
                <button
                  type="button"
                  onClick={connectDevnetWallet}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-cyan/40 bg-cyanSoft/20 hover:bg-cyanSoft/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan/20 flex items-center justify-center text-xl">
                      ⚡
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">Devnet Sandbox Wallet</p>
                        <span className="tag-tab text-[9px] bg-cyan text-paper px-1.5 py-0.2 rounded-full font-bold">
                          INSTANT + 50 USDC
                        </span>
                      </div>
                      <p className="text-[11px] text-inkSoft">Test x402 flow without any browser extensions</p>
                    </div>
                  </div>
                  <span className="tag-tab text-[10px] text-cyan group-hover:translate-x-0.5 transition-transform">
                    START →
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
