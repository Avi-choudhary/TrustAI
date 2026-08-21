import { useState } from 'react'

const STATUS_STYLES = {
  flag: { dot: 'bg-high', text: 'text-high', label: 'FLAGGED' },
  info: { dot: 'bg-graphite', text: 'text-graphite', label: 'INFO' },
  clear: { dot: 'bg-low', text: 'text-low', label: 'CLEAR' }
}

const TYPE_ACCENT = {
  metadata: '#FF6A2C',
  ela: '#FFB37A',
  ocr: '#FBBF24',
  spectral: '#FB6161'
}

const TYPE_LABEL = {
  metadata: 'PROVENANCE',
  ela: 'RESIDUAL',
  ocr: 'OCR',
  spectral: 'SPECTRAL'
}

export default function EvidenceTag({ signal }) {
  const [open, setOpen] = useState(signal.status === 'flag')
  const style = STATUS_STYLES[signal.status] ?? STATUS_STYLES.info
  const accent = TYPE_ACCENT[signal.type] ?? '#7A736C'
  const hasDetails = (signal.details && signal.details.length > 0) || (signal.hotzones && signal.hotzones.length > 0)

  return (
    <div
      className="border border-graphite/25 rounded-sm bg-paperDark/50 overflow-hidden"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <button
        onClick={() => hasDetails && setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="tag-tab text-[10px]" style={{ color: accent }}>{TYPE_LABEL[signal.type] ?? signal.type.toUpperCase()}</span>
              <span className={`tag-tab text-[10px] font-semibold ${style.text}`}>{style.label}</span>
            </div>
            <p className="font-medium text-sm mt-0.5 truncate text-ink">{signal.label}</p>
          </div>
        </div>
        {hasDetails && (
          <svg
            className={`shrink-0 transition-transform text-graphite ${open ? 'rotate-180' : ''}`}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="px-4 pb-3.5">
        <p className="text-sm text-inkSoft">{signal.summary}</p>

        {open && signal.details && signal.details.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t hairline pt-3">
            {signal.details.map((d, i) => (
              <li key={i} className="text-sm flex gap-2 text-ink">
                <span className="text-graphite mt-0.5">—</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}

        {open && signal.hotzones && signal.hotzones.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t hairline pt-3">
            {signal.hotzones.map((h, i) => (
              <li key={i} className="text-sm flex justify-between gap-3 text-ink">
                <span>
                  <span className="text-graphite mr-1">—</span>
                  {h.note || `Region ${i + 1}`}
                </span>
                <span className="tag-tab text-xs text-high shrink-0">{Math.round(h.confidence * 100)}% conf.</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
