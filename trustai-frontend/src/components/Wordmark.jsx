// TrustAI wordmark — the brand's "TRUST AI" text lockup, split into two
// image assets so each half can be themed independently: the dark "TRUST"
// text inverts to white on dark surfaces (via .brand-wordmark in
// index.css), while the orange "AI" mark is left untouched so it always
// stays brand-orange instead of flipping to blue when inverted. Used
// alongside <Logo /> in headers/navbars/auth screens, not on dark sections
// (footer, testimonials) — those keep the plain text label in white instead.

export default function Wordmark({ height = 18, className = '' }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ height }}>
      <img
        src="/brand/logo-wordmark-trust.png"
        height={height}
        alt="Trust"
        className="brand-wordmark object-contain"
        style={{ height }}
      />
      <img
        src="/brand/logo-wordmark-ai.png"
        height={height}
        alt="AI"
        className="object-contain ml-[0.12em]"
        style={{ height }}
      />
    </span>
  )
}
