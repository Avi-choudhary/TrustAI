// Shown as an overlay when a (mocked, for now) payment attempt fails —
// stays on the checkout page underneath rather than navigating to a
// separate route, so retrying is a single click. Same dialog-card /
// dimmed-backdrop pattern as AuthGateModal, in the app's "declined" color.
export default function PaymentFailedModal({ onRetry, onChangeMethod, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-failed-title"
    >
      <div className="relative w-full max-w-sm bg-paperDark border border-graphite/25 rounded-sm shadow-softLg p-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-inkSoft hover:text-ink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="w-16 h-16 mx-auto rounded-full bg-highSoft flex items-center justify-center text-high">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>

        <h2 id="payment-failed-title" className="font-display text-xl font-semibold tracking-tight text-ink mt-4">
          Payment Failed!
        </h2>
        <p className="text-inkSoft mt-2 text-sm leading-relaxed">
          We were unable to process your payment.
          <br />
          Please try again or choose a different payment method.
        </p>

        <div className="flex flex-col gap-2.5 mt-6">
          <button
            type="button"
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3 rounded-sm hover:opacity-90 shadow-glow transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={onChangeMethod}
            className="w-full flex items-center justify-center gap-2 tag-tab text-xs font-semibold border border-graphite/35 text-ink px-5 py-3 rounded-sm hover:bg-mist transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <path d="M1 10h22" />
            </svg>
            CHANGE PAYMENT METHOD
          </button>
        </div>

        <p className="text-xs text-inkSoft mt-5 flex items-center justify-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0118 0v6" />
            <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
          </svg>
          Need help?{' '}
          <a href="mailto:support@trustai.app" className="text-cyan font-medium hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
