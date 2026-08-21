import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandingHeader from '../components/landing/LandingHeader'
import LandingFooter from '../components/landing/LandingFooter'
import { useWallet } from '../context/WalletContext'

export default function PricingPage() {
  const [currencyMode, setCurrencyMode] = useState('crypto') // 'fiat' | 'crypto'
  const { isConnected, openWalletModal, address, usdcBalance } = useWallet()
  const navigate = useNavigate()

  const plans = [
    {
      name: 'Free',
      price: currencyMode === 'crypto' ? '0 USDC' : '₹0',
      period: 'forever',
      tagline: 'Try TrustAI on individual files, no card or wallet required.',
      features: [
        'Unlimited single-file checks',
        'Metadata, OCR & layout analysis',
        'Error Level Analysis for images',
        'Deepfake detection (beta)',
        'Community support',
      ],
      cta: 'Get started',
      href: '/check',
      highlight: false,
    },
    {
      name: '3-Month Plan',
      price: currencyMode === 'crypto' ? '4.99 USDC' : '₹399',
      period: 'for 3 months',
      tagline: 'For recruiters, journalists & teams verifying in volume.',
      features: [
        'Everything in Free',
        'Bulk & batch intake',
        'Full case history & search',
        'Team workspaces',
        'Priority support',
        'Tamper-evident blockchain audit receipts',
        'x402 Instant Wallet Settlement on Base / Solana',
      ],
      cta: currencyMode === 'crypto' ? 'Pay with x402 (4.99 USDC)' : 'Choose this plan (₹399)',
      href:
        currencyMode === 'crypto'
          ? '/checkout?plan=3-Month Plan&amount=4.99 USDC&method=x402'
          : '/checkout?plan=3-Month Plan&amount=₹399&method=razorpay',
      highlight: true,
      badge: 'MOST POPULAR',
    },
  ]

  const onDemandScans = {
    name: 'Pay-Per-Scan (x402 On-Demand)',
    price: '0.10 USDC',
    period: 'per verification',
    tagline: 'For developers, automated pipelines & AI agents requiring autonomous micropayments.',
    features: [
      'Machine-to-machine HTTP 402 challenge handling',
      'Zero subscription lock-in or recurring fees',
      'Direct Base L2 / Solana / Ethereum settlement',
      'Automatic tamper-proof cryptographic receipt',
    ],
  }

  return (
    <div className="bg-paper min-h-screen">
      <LandingHeader />

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyanSoft/50 border border-cyan/40 text-cyan text-xs font-semibold tag-tab mb-3">
              <span>⚡</span> X402 PAYMENT PROTOCOL ACTIVATED
            </div>
            <h1 className="font-display text-3xl md:text-[2.6rem] font-semibold text-ink tracking-tight leading-[1.1]">
              Instant access, zero friction pricing
            </h1>
            <p className="text-inkSoft mt-3.5 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              Pay with traditional cards &amp; UPI or settle instantly using the open{' '}
              <strong className="text-ink font-semibold">x402 Web3 payment protocol</strong> directly from your wallet.
            </p>

            {/* Currency Mode Switcher */}
            <div className="mt-8 inline-flex items-center p-1 rounded-full bg-paperDark border border-graphite/30 shadow-soft">
              <button
                type="button"
                onClick={() => setCurrencyMode('crypto')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tag-tab transition-all ${
                  currencyMode === 'crypto'
                    ? 'bg-gradient-to-r from-violet to-cyan text-paper shadow-sm'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                <span>⚡</span>
                <span>Web3 / x402 (USDC)</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('fiat')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tag-tab transition-all ${
                  currencyMode === 'fiat'
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                <span>💳</span>
                <span>Card &amp; UPI (₹ INR)</span>
              </button>
            </div>
          </div>

          {/* x402 Protocol Info Callout */}
          {currencyMode === 'crypto' && (
            <div className="mb-10 p-4 rounded-xl bg-cyanSoft/30 border border-cyan/30 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet to-cyan text-paper flex items-center justify-center text-lg font-bold shadow-glow shrink-0">
                  402
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">
                    HTTP 402 Native Micropayments Standard
                  </p>
                  <p className="text-[11px] text-inkSoft">
                    Supported across Base, Ethereum, Polygon &amp; Solana. Instant signature settlement without middlemen.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <button
                    type="button"
                    onClick={openWalletModal}
                    className="tag-tab text-[11px] px-3 py-1.5 rounded-sm bg-paper border border-cyan/50 text-cyan hover:bg-mist transition-colors"
                  >
                    Wallet: {usdcBalance.toFixed(0)} USDC ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openWalletModal}
                    className="tag-tab text-[11px] font-semibold px-3.5 py-1.5 rounded-sm bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 transition-opacity"
                  >
                    Connect Wallet →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-feature p-8 flex flex-col transition-all ${
                  plan.highlight
                    ? 'bg-[#171513] text-white shadow-softLg ring-2 ring-cyan/50'
                    : 'bg-paperDark border border-ink/[0.08] shadow-soft'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-8 tag-tab text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-violet to-cyan text-paper font-semibold shadow-glow">
                    {currencyMode === 'crypto' ? '⚡ x402 POWERED' : plan.badge}
                  </span>
                )}

                <p className={`tag-tab text-[10px] mb-3 ${plan.highlight ? 'text-white/60' : 'text-graphite'}`}>
                  {plan.name.toUpperCase()}
                </p>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-graphite'}`}>{plan.period}</span>
                </div>

                <p className={`text-sm mb-7 leading-relaxed ${plan.highlight ? 'text-white/70' : 'text-inkSoft'}`}>
                  {plan.tagline}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round"
                        className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-cyan' : 'text-seal'}`}
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className={plan.highlight ? 'text-white/90' : 'text-ink'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.href}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all shadow-soft ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 hover:-translate-y-px shadow-glow'
                      : 'bg-mist text-ink hover:bg-mistDark'
                  }`}
                >
                  {currencyMode === 'crypto' && plan.highlight && <span>⚡</span>}
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* On-Demand Micro-tier for Agents / Developers */}
          <div className="mt-10 p-6 rounded-2xl bg-paperDark border border-graphite/30 shadow-soft">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-md">
                <span className="tag-tab text-[10px] text-cyan font-semibold">
                  API &amp; AI AGENT PAYMENTS
                </span>
                <h3 className="font-display text-lg font-semibold text-ink mt-1">
                  {onDemandScans.name}
                </h3>
                <p className="text-xs text-inkSoft mt-1">
                  {onDemandScans.tagline}
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-semibold text-cyan">
                  {onDemandScans.price}
                </span>
                <span className="text-xs text-graphite block">{onDemandScans.period}</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t hairline text-xs text-inkSoft">
              {onDemandScans.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <span className="text-cyan font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-inkSoft">
                <span>Direct endpoint: </span>
                <code className="tag-tab text-[11px] text-cyan bg-paper px-2 py-0.5 rounded border border-graphite/20 font-mono">
                  POST /api/x402/challenge
                </code>
              </div>
              <Link
                to="/wallet"
                className="tag-tab text-xs font-semibold text-cyan hover:underline transition-colors flex items-center gap-1"
              >
                OPEN X402 PLAYGROUND &amp; WALLET →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
