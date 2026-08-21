import { Link, useSearchParams } from 'react-router-dom'
import { truncateAddress } from '../utils/x402'

function fallbackTxnId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = 'TXN'
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function billingCycleFor(plan) {
  const match = plan.match(/(\d+)\s*-?\s*Month/i)
  return match ? `${match[1]} Month${match[1] === '1' ? '' : 's'}` : '90 Days'
}

function nextBillingDateFor(plan, from) {
  const match = plan.match(/(\d+)\s*-?\s*Month/i)
  const months = match ? Number(match[1]) : 3
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const plan = params.get('plan') || '3-Month Plan'
  const amount = params.get('amount') || '4.99 USDC'
  const method = params.get('method') || 'x402 Protocol (Base L2)'
  const txn = params.get('txn') || fallbackTxnId()
  const orderId = params.get('orderId')
  const blockHash = params.get('blockHash')
  const blockIndex = params.get('blockIndex')

  const now = new Date()
  const paymentDate = now.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const nextBillingDate = nextBillingDateFor(plan, now).toLocaleDateString(
    undefined,
    { day: '2-digit', month: 'short', year: 'numeric' }
  )

  const rows = [
    { label: 'Plan Purchased', value: plan },
    { label: 'Billing Period', value: billingCycleFor(plan) },
    { label: 'Amount Paid', value: amount },
    { label: 'Payment Protocol / Gateway', value: method },
    { label: 'Transaction ID / Hash', value: txn, mono: true },
    ...(orderId ? [{ label: 'x402 Order Reference', value: orderId, mono: true }] : []),
    { label: 'Settlement Time', value: paymentDate },
    { label: 'Access Expires', value: nextBillingDate },
  ]

  return (
    <div className="max-w-lg mx-auto px-5 py-14">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-glow">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyanSoft/50 text-cyan text-[10px] font-semibold tag-tab mt-3">
          <span>⚡</span> X402 VERIFIED &amp; SETTLED
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink mt-2">
          Payment <span className="text-emerald-600">Successful!</span>
        </h1>
        <p className="text-sm text-inkSoft mt-2 max-w-sm">
          Your payment has been settled and stamped onto the audit ledger. Premium features are now fully activated.
        </p>
      </div>

      {/* Blockchain Ledger Receipt Card */}
      {blockHash && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-paper to-paperDark border border-cyan/40 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="tag-tab text-[10px] text-cyan font-bold flex items-center gap-1.5">
              <span>⛓</span> BLOCKCHAIN AUDIT RECEIPT
            </span>
            <span className="tag-tab text-[10px] text-emerald-600 font-semibold">
              BLOCK #{blockIndex || '1'} VERIFIED ✓
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-inkSoft truncate">
            <span className="text-graphite">Block Hash: </span>
            <span className="text-ink">{truncateAddress(blockHash, 14, 10)}</span>
          </div>
        </div>
      )}

      {/* Payment Details Table */}
      <div className="mt-5 border border-graphite/25 rounded-xl bg-paperDark/70 overflow-hidden shadow-soft">
        <div className="px-4 py-2.5 tag-tab text-[10px] text-graphite border-b hairline font-semibold">
          TRANSACTION SUMMARY
        </div>
        <div className="divide-y hairline">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3 text-xs"
            >
              <span className="text-inkSoft">{row.label}</span>
              <span
                className={`text-ink font-medium text-right max-w-[200px] truncate ${
                  row.mono ? 'font-mono text-[11px]' : ''
                }`}
                title={row.value}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          to="/check"
          className="flex-1 text-center tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3.5 rounded-xl hover:opacity-90 shadow-glow transition-all"
        >
          START NEW VERIFICATION →
        </Link>
        <Link
          to="/wallet"
          className="flex-1 text-center tag-tab text-xs font-semibold border border-graphite/35 text-ink px-5 py-3.5 rounded-xl hover:bg-mist transition-colors"
        >
          VIEW WALLET LEDGER
        </Link>
      </div>

      {/* Unlock banner */}
      <div className="flex items-start gap-3 mt-5 border border-emerald-500/25 bg-emerald-500/10 rounded-xl px-4 py-3.5">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-600 shrink-0 mt-0.5"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p className="text-xs text-ink leading-relaxed">
          Premium unlocked: Batch intake, AI image &amp; PDF tampering detection, deepfake synthesis analysis, and immutable blockchain stamps.
        </p>
      </div>

      <p className="text-center mt-6">
        <Link
          to="/"
          className="tag-tab text-[11px] text-inkSoft hover:text-ink underline underline-offset-2 transition-colors"
        >
          BACK TO HOME
        </Link>
      </p>
    </div>
  )
}
