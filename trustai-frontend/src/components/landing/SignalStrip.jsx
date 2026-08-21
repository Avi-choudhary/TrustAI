import HorizontalScroller from '../HorizontalScroller'

const SIGNALS = [
  { name: 'Metadata / EXIF', desc: 'Edit history & timestamps', icon: 'M4 4h16v16H4z M8 9h8 M8 13h5' },
  { name: 'Error Level Analysis', desc: 'Recompression artifacts', icon: 'M3 12h4l2-7 4 14 2-7h6' },
  { name: 'OCR & Layout', desc: 'Font & baseline checks', icon: 'M4 6h16 M4 12h10 M4 18h16' },
  { name: 'Deepfake Detection', desc: 'Face & voice synthesis', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18z M9 10h.01 M15 10h.01 M8 15c1.5 1.3 6.5 1.3 8 0' },
  { name: 'Seal & Stamp Matching', desc: 'Cross-checks official seals', icon: 'M12 2l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5L4.8 7.3l5-.7L12 2z M8 15.5V22l4-2 4 2v-6.5' },
  { name: 'Font Consistency', desc: 'Weight & spacing drift', icon: 'M6 20V6l6-2 6 2v14 M6 12h12' },
  { name: 'Compression Mapping', desc: 'Localized edit zones', icon: 'M4 4h7v7H4z M13 13h7v7h-7z M13 4h7v7h-7z M4 13h7v7H4z' },
  { name: 'Signature Verification', desc: 'Cross-case comparison', icon: 'M3 17c3-4 6 2 9-2s6 2 9-2' },
  { name: 'Duplicate Regions', desc: 'Copy-move detection', icon: 'M9 3h9v9H9z M6 6H3v15h15v-3' },
  { name: 'GPS & Device Trace', desc: 'Capture location & model', icon: 'M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z M12 11a2 2 0 100-4 2 2 0 000 4z' }
]

const TRUST_BULLETS = [
  'No file is stored without your consent',
  'Most reports return in under 30 seconds',
  'Detection thresholds reviewed by forensic examiners'
]

export default function SignalStrip() {
  return (
    <section id="signals" className="py-20 md:py-24 bg-paper">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="tag-tab text-[10px] text-graphite mb-2">EVERY SIGNAL WE CHECK</p>
            <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-ink tracking-tight">
              One upload, ten checks
            </h2>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <HorizontalScroller ariaLabel="Verification signals" className="flex gap-4 pb-1 -mx-1 px-1 snap-x snap-mandatory">
          {SIGNALS.map((s) => (
            <div
              key={s.name}
              className="group snap-start shrink-0 w-[168px] rounded-2xl border border-ink/[0.08] bg-paperDark hover:border-seal hover:bg-sealSoft/40 hover:shadow-soft transition-all p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-paperDark shadow-soft flex items-center justify-center mb-8 group-hover:bg-seal transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink group-hover:text-white transition-colors" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </div>
              <p className="text-sm font-semibold text-ink leading-snug">{s.name}</p>
              <p className="text-xs text-inkSoft mt-1 leading-snug">{s.desc}</p>
              <a href="#overview" className="hidden group-hover:inline-flex items-center gap-1 text-[11px] font-semibold text-seal mt-3">
                See how it works &rarr;
              </a>
            </div>
          ))}
        </HorizontalScroller>
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <ul className="flex flex-col sm:flex-row flex-wrap gap-x-8 gap-y-2">
          {TRUST_BULLETS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-inkSoft">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6A2C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
        <a href="#overview" className="text-sm font-semibold text-ink hover:text-seal transition-colors shrink-0">
          Browse all signals &rarr;
        </a>
      </div>
    </section>
  )
}
