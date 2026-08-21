// TrustAI mark — the brand's shield + neural-profile seal, supplied as the
// official logo asset. Rendered as an <img> so the navbar, auth screens,
// and stamp components all stay in sync from one file if the mark ever
// changes; size is controlled the same way the old inline SVG was.

export default function Logo({ size = 32, className = '' }) {
  return (
    <img
      src="/brand/logo-mark.png"
      width={size}
      height={size}
      alt="TrustAI logo"
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
