import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PLAN_BADGE, getMockSubscription } from '../utils/subscription'

// Account-side billing view (different from the public /pricing page).
// All figures are mocked via src/utils/subscription.js until a real
// billing backend exists — swap getMockSubscription() for an API call
// there and this page doesn't need to change.
export default function SubscriptionPage() {
  const { user } = useAuth()
  const sub = getMockSubscription(user?.plan)
  const badge = PLAN_BADGE[sub.plan] || PLAN_BADGE.FREE

  const usagePct =
    typeof sub.scansLimit === 'number' ? Math.min(100, Math.round((sub.scansUsed / sub.scansLimit) * 100)) : null

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="mb-6">
        <p className="tag-tab text-xs text-cyan mb-2">ACCOUNT</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Subscription &amp; billing</h1>
        <p className="text-sm text-inkSoft mt-1">Manage your plan, usage, and payment history.</p>
      </div>

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-5">
        {/* Plan summary */}
        <div className="border border-graphite/25 rounded-sm bg-paperDark/50 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`inline-block tag-tab text-[10px] font-semibold px-2.5 py-1 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
              <p className="font-display text-2xl font-semibold tracking-tight text-ink mt-3">{sub.priceLabel}</p>
              <p className="tag-tab text-[10px] text-graphite mt-1">STATUS · {sub.status.toUpperCase()}</p>
            </div>
            <Link
              to="/pricing"
              className="tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-4 py-2.5 rounded-sm hover:opacity-90 shadow-glow transition-opacity whitespace-nowrap"
            >
              UPGRADE PLAN
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t hairline">
            <div>
              <p className="tag-tab text-[10px] text-graphite">STARTED</p>
              <p className="text-sm text-ink mt-1">{new Date(sub.startedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="tag-tab text-[10px] text-graphite">NEXT BILLING DATE</p>
              <p className="text-sm text-ink mt-1">
                {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {sub.plan !== 'FREE' && (
            <button
              type="button"
              className="tag-tab text-xs text-graphite hover:text-high transition-colors underline underline-offset-2 mt-6"
            >
              MANAGE OR CANCEL SUBSCRIPTION
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="border border-graphite/25 rounded-sm bg-paperDark/50 p-6">
          <p className="tag-tab text-[10px] text-graphite mb-3">SCANS USED THIS CYCLE</p>
          <p className="font-display text-3xl font-semibold tracking-tight text-ink">
            {sub.scansUsed}
            <span className="text-base font-normal text-graphite"> / {sub.scansLimit}</span>
          </p>
          {usagePct !== null && (
            <div className="mt-4 h-1.5 rounded-full bg-mist overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet to-cyan transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
          <p className="text-sm text-inkSoft mt-3">
            {typeof sub.scansLimit === 'number'
              ? `${Math.max(0, sub.scansLimit - sub.scansUsed)} scans remaining this cycle.`
              : 'Unlimited scans on this plan.'}
          </p>
        </div>
      </div>

      {/* Payment history */}
      <div className="mt-5 border border-graphite/25 rounded-sm bg-paperDark/50 overflow-hidden">
        <div className="px-4 py-2.5 tag-tab text-[10px] text-graphite border-b hairline">PAYMENT HISTORY</div>
        {sub.paymentHistory.length === 0 ? (
          <p className="text-sm text-inkSoft px-4 py-6">No payments yet — you're on the free plan.</p>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 tag-tab text-[10px] text-graphite border-b hairline">
              <span>INVOICE</span>
              <span>DATE</span>
              <span>AMOUNT</span>
              <span>STATUS</span>
            </div>
            {sub.paymentHistory.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center border-b hairline last:border-b-0"
              >
                <span className="tag-tab text-xs text-ink case-number">{row.id}</span>
                <span className="text-sm text-inkSoft whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</span>
                <span className="text-sm text-ink whitespace-nowrap">{row.amount}</span>
                <span className="tag-tab text-[10px] font-semibold text-low bg-lowSoft px-2.5 py-1 rounded-sm whitespace-nowrap">
                  {row.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
