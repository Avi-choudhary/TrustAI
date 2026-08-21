import { useRef } from 'react'

const VARIANTS = {
  light: {
    btn: 'bg-white ring-1 ring-ink/[0.12] text-ink hover:bg-sealSoft hover:ring-seal',
  },
  dark: {
    btn: 'bg-[#211F1C] ring-1 ring-white/[0.12] text-[#F7F4EF] hover:bg-[#2A2724] hover:ring-white/[0.24]',
  },
}

function Arrow({ dir, onClick, variant, label }) {
  const styles = VARIANTS[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-9 h-9 rounded-full shadow-soft flex items-center justify-center shrink-0 transition-colors ${styles.btn}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}

/**
 * Wraps a horizontally-scrolling row of content, hides the native scrollbar,
 * and gives the user a pair of "<" / ">" buttons to page through it instead.
 */
export default function HorizontalScroller({
  children,
  className = '',
  variant = 'light',
  ariaLabel = 'Scrollable content',
  arrowsPosition = 'bottom',
  arrowsClassName = '',
}) {
  const scrollerRef = useRef(null)

  function page(direction) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const arrows = (
    <div className={`flex items-center gap-2 ${arrowsPosition === 'bottom' ? 'mt-5 justify-end' : ''} ${arrowsClassName}`}>
      <Arrow dir="left" variant={variant} label="Scroll left" onClick={() => page(-1)} />
      <Arrow dir="right" variant={variant} label="Scroll right" onClick={() => page(1)} />
    </div>
  )

  return (
    <div>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        className={`no-scrollbar overflow-x-auto ${className}`}
      >
        {children}
      </div>
      {arrows}
    </div>
  )
}
