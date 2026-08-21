// Mock subscription + account data used by UserMenu and SubscriptionPage
// until real billing/account endpoints exist. Keep this the single place
// that shape lives so swapping in a real API later only touches this file.

export const PLAN_BADGE = {
  FREE: {
    label: 'FREE PLAN',
    classes: 'text-graphite bg-mist border border-graphite/30'
  },
  PLUS: {
    label: 'PLUS PLAN',
    classes: 'text-paper bg-gradient-to-r from-violet to-cyan border border-transparent'
  },
  ENTERPRISE: {
    label: 'ENTERPRISE',
    classes: 'text-paper bg-gradient-to-r from-seal to-medium border border-transparent'
  }
}

export function getMockSubscription(plan = 'FREE') {
  const isFree = plan === 'FREE'
  const isEnterprise = plan === 'ENTERPRISE'

  return {
    plan,
    status: 'Active',
    priceLabel: isFree ? '₹0 / month' : isEnterprise ? 'Custom' : '₹399 / 3 months',
    scansUsed: isFree ? 7 : isEnterprise ? 842 : 142,
    scansLimit: isFree ? 10 : isEnterprise ? 'Unlimited' : 500,
    startedAt: '2026-03-14',
    nextBillingDate: isFree ? null : '2026-09-14',
    paymentHistory: isFree
      ? []
      : [
          { id: 'INV-2026-0814', date: '2026-08-14', amount: isEnterprise ? '₹24,999' : '₹399', status: 'Paid' },
          { id: 'INV-2026-0514', date: '2026-05-14', amount: isEnterprise ? '₹24,999' : '₹399', status: 'Paid' },
          { id: 'INV-2026-0214', date: '2026-02-14', amount: isEnterprise ? '₹24,999' : '₹399', status: 'Paid' }
        ]
  }
}

export function getInitials(name = '', email = '') {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '') || '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  // True initials: one letter per word (e.g. "Ashish Mishra" -> "AM"). A
  // single-word name only has one initial to give (e.g. "ashish" -> "A") —
  // it should never fall back to that word's first two letters.
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0]?.[0] || '?'
  return initials.toUpperCase()
}
