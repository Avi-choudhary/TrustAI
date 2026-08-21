import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const STAT_CARDS = [
  {
    id: 'active',
    label: 'Active Cases',
    sub: 'being reviewed right now',
    color: '#A56B00',
    track: '#F3DFAE',
    startValue: 1842,
    step: [1, 3],
    startPct: 0.62
  },
  {
    id: 'perHour',
    label: 'Cases / Hour',
    sub: 'files submitted for review',
    color: '#FF6B2C',
    track: '#FFD9C2',
    startValue: 612,
    step: [1, 4],
    startPct: 0.78
  },
  {
    id: 'fakes',
    label: 'Fake Docs / Hour',
    sub: 'forged files detected',
    color: '#D92D3A',
    track: '#F6C3C8',
    startValue: 184,
    step: [0, 2],
    startPct: 0.24
  },
  {
    id: 'solved',
    label: 'Solved / Hour',
    sub: 'cases cleared by TrustAI',
    color: '#087A5B',
    track: '#BEE3D4',
    startValue: 598,
    step: [1, 4],
    startPct: 0.91
  }
]

function clampPct(p) {
  return Math.max(0.1, Math.min(0.97, p))
}

function useLiveStats() {
  const [stats, setStats] = useState(() =>
    Object.fromEntries(STAT_CARDS.map((c) => [c.id, { value: c.startValue, pct: c.startPct }]))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const next = { ...prev }
        for (const c of STAT_CARDS) {
          const [min, max] = c.step
          const bump = Math.floor(Math.random() * (max - min + 1)) + min
          const drift = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.6 ? 0.01 : 0.02)
          next[c.id] = {
            value: prev[c.id].value + bump,
            pct: clampPct(prev[c.id].pct + drift)
          }
        }
        return next
      })
    }, 2600)
    return () => clearInterval(interval)
  }, [])

  return stats
}

const GR = 40
const GCX = 50
const GCY = 50
const GAUGE_SWEEP = 180 // semicircle, left to right over the top

// t = 0 at left end of the gauge, t = 1 at right end, arcing over the top
function gaugePoint(t) {
  const theta = ((GAUGE_SWEEP - GAUGE_SWEEP * t) * Math.PI) / 180
  return { x: GCX + GR * Math.cos(theta), y: GCY - GR * Math.sin(theta) }
}

function gaugeArcPath(t0, t1) {
  const start = gaugePoint(t0)
  const end = gaugePoint(t1)
  const largeArc = (t1 - t0) * GAUGE_SWEEP > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${GR} ${GR} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function PieStatCard({ card, live }) {
  const { label, sub, color, track } = card
  const { value, pct } = live
  const filledT = Math.min(Math.max(pct, 0.02), 0.98)

  return (
    <div className="rounded-card bg-paperDark shadow-softLg ring-1 ring-ink/[0.08] p-3.5 pt-4 flex flex-col items-center hover:-translate-y-0.5 transition-transform duration-300">
      <div className="relative w-full" style={{ aspectRatio: '100 / 58' }}>
        <svg viewBox="0 0 100 58" className="w-full h-full overflow-visible" style={{ filter: 'drop-shadow(0 6px 10px rgba(35,25,15,0.14))' }}>
          <path d={gaugeArcPath(0, 1)} fill="none" stroke={track} strokeWidth="11" strokeLinecap="round" />
          <path
            d={gaugeArcPath(0, filledT)}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            style={{ transition: 'd 1s ease' }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <p className="font-display font-semibold text-lg text-ink leading-tight tabular-nums">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="tag-tab text-[8px] text-graphite leading-tight mt-1 text-center">{label.toUpperCase()}</p>
      <p className="text-[10px] text-inkSoft leading-snug mt-0.5 text-center">{sub}</p>
      <p className="flex items-center gap-1 tag-tab text-[8px] mt-1.5" style={{ color }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulseGlow" style={{ background: color }} />
        LIVE
      </p>
    </div>
  )
}

export default function HeroSection() {
  const liveStats = useLiveStats()
  return (
    <section className="relative overflow-hidden bg-paper">
      {/* signature glow — a soft eclipse arc behind the hero, echoing the
          brand\u2019s verification/trust motif in warm brand tones */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-10 w-[820px] h-[820px] rounded-full blur-3xl animate-pulseGlow"
        style={{ background: 'radial-gradient(circle, rgba(255,107,44,0.10) 0%, rgba(255,107,44,0.05) 45%, rgba(255,107,44,0) 72%)' }}
      />

      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-24 md:pb-28 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 text-center lg:text-left">
            <span className="tag-tab inline-block text-[10px] text-seal bg-paperDark border border-ink/[0.1] rounded-full px-3 py-1.5 mb-6 tracking-[0.12em]">
              DOCUMENT &amp; MEDIA FORENSICS
            </span>
            <h1 className="font-display font-semibold text-[2.6rem] sm:text-5xl lg:text-[3.2rem] leading-[1.08] tracking-tight text-ink">
              Know what&rsquo;s real before it <span className="text-seal">costs you.</span>
            </h1>
            <p className="text-inkSoft text-lg mt-5 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              TrustAI checks metadata, compression artifacts, and layout consistency across documents,
              images, and deepfakes &mdash; surfacing likely tampering or AI generation in seconds, not days.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
              <Link
                to="/check"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-seal shadow-soft hover:bg-sealHover hover:-translate-y-px transition-all"
              >
                Start a free check
              </Link>
              <a href="#overview" className="text-sm font-semibold text-ink hover:text-seal transition-colors">
                See how detection works <span className="text-seal">&rarr;</span>
              </a>
            </div>
          </div>

          <div className="relative z-10">
            <div className="grid grid-cols-2 gap-3.5 max-w-[420px] mx-auto">
              {STAT_CARDS.map((c) => (
                <PieStatCard key={c.id} card={c} live={liveStats[c.id]} />
              ))}
            </div>

            {/* floating social-proof badge */}
            <div className="max-w-[420px] mx-auto mt-3.5 bg-paperDark rounded-2xl shadow-softLg ring-1 ring-ink/[0.08] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-seal flex items-center justify-center text-white text-xs font-semibold shrink-0">
                4.9
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-ink">Rated by 3,100+ reviewers</p>
                <p className="text-[11px] text-inkSoft">across newsrooms &amp; universities</p>
              </div>
            </div>
          </div>
        </div>

        {/* stat callout */}
        <div className="mt-16 flex items-center justify-center lg:justify-start gap-3 text-sm text-inkSoft">
          <span className="flex -space-x-2.5">
            {[
              'https://i.pravatar.cc/64?img=32',
              'https://i.pravatar.cc/64?img=47',
              'https://i.pravatar.cc/64?img=12',
              'https://i.pravatar.cc/64?img=5'
            ].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="relative w-8 h-8 rounded-full ring-2 ring-paper shadow-soft object-cover"
              />
            ))}
          </span>
          <span>
            <strong className="text-ink font-semibold">12,400 files</strong> were verified by teams like yours last week.
          </span>
        </div>
      </div>
    </section>
  )
}
