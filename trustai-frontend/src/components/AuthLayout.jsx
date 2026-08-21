import Logo from './Logo'
import Wordmark from './Wordmark'

const CREDENTIALS = [
  '142 JURISDICTIONS RECOGNIZED',
  '38 LANGUAGES SUPPORTED',
  '2.4M+ CASES IN REGISTRY',
  'ISO-STYLE CASE NUMBERING'
]

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      {/* Left — registry / brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-paperDark text-ink px-12 py-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)',
            backgroundSize: '22px 22px'
          }}
        />
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-25"
          style={{ background: 'linear-gradient(135deg, #FF6A2C, #FFB37A)' }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div className="leading-tight">
              <Wordmark height={13} />
              <div className="tag-tab text-[10px] text-inkSoft mt-1.5">GLOBAL VERIFICATION REGISTRY</div>
            </div>
          </div>

          <p className="mt-16 font-display text-2xl font-semibold tracking-tight leading-snug max-w-sm">
            One evidence standard, <span className="spectrum-text">wherever</span> the file was made.
          </p>
          <p className="text-inkSoft mt-3 max-w-sm text-sm leading-relaxed">
            TrustAI analysts work the same case file — metadata, ELA, and OCR signals rendered
            identically — whether the submission comes from Lagos, Berlin, or Manila.
          </p>
        </div>

        <div className="relative">
          <p className="tag-tab text-[10px] text-graphite mb-3">REGISTRY CREDENTIALS</p>
          <ul className="space-y-2">
            {CREDENTIALS.map((c) => (
              <li key={c} className="tag-tab text-[11px] flex items-center gap-2.5 text-inkSoft">
                <span className="w-1.5 h-1.5 rounded-full bg-seal shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <p className="tag-tab text-xs text-cyan mb-2">{eyebrow}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-inkSoft mt-2 text-sm leading-relaxed">{subtitle}</p>}

          <div className="mt-8 border border-graphite/25 rounded-sm bg-paperDark/50 p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
