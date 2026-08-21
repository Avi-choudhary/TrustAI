import HorizontalScroller from '../HorizontalScroller'

const DIALS = [
  {
    id: 'cases',
    value: '2.4M+',
    label: 'Cases verified',
    sub: 'Total, to date',
    color: '#FF6B2C',
    trackColor: '#FFD9C2',
    percent: 0.69
  },
  {
    id: 'countries',
    value: '142',
    label: 'Countries & territories',
    sub: 'Of 195 nations',
    color: '#FF8A5B',
    trackColor: '#FFE1D0',
    percent: 142 / 195
  },
  {
    id: 'languages',
    value: '38',
    label: 'Languages supported',
    sub: 'Read natively',
    color: '#A56B00',
    trackColor: '#F3DFAE',
    percent: 0.64
  }
]

const R = 44
const CX = 50
const CY = 50

// angle 0 = 12 o'clock, increases clockwise — matches how a pie chart reads
function polar(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) }
}

function wedgePath(startDeg, endDeg) {
  const start = polar(startDeg)
  const end = polar(endDeg)
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function StatDial({ value, label, sub, color, trackColor, percent, id }) {
  const filledDeg = Math.min(percent, 1) * 360
  const isFull = percent >= 0.999

  return (
    <div className="flex flex-row items-center gap-4 shrink-0 min-w-[210px] md:min-w-0 md:flex-1 rounded-card bg-paperDark border border-ink/[0.07] px-5 py-5 md:px-4 snap-start">
      <div className="relative shrink-0 w-[100px] h-[100px]">
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 10px 14px rgba(35,25,15,0.16))' }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.72" />
            </linearGradient>
            <linearGradient id={`track-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={trackColor} stopOpacity="1" />
              <stop offset="100%" stopColor={trackColor} stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {isFull ? (
            <circle cx={CX} cy={CY} r={R} fill={`url(#fill-${id})`} />
          ) : (
            <>
              <path d={wedgePath(filledDeg, 360)} fill={`url(#track-${id})`} />
              <path d={wedgePath(0, filledDeg)} fill={`url(#fill-${id})`} stroke="#F7F4EF" strokeWidth="1.5" />
            </>
          )}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(23,21,19,0.06)" strokeWidth="1" />
        </svg>
      </div>
      <div>
        <p className="font-display font-semibold text-lg text-ink tracking-tight">{value}</p>
        <p className="tag-tab text-[9px] text-graphite leading-snug mt-1">{label.toUpperCase()}</p>
        <p className="text-xs text-inkSoft mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function LiveIntakeCard() {
  return (
    <div className="relative flex flex-row items-center gap-5 shrink-0 min-w-[260px] md:min-w-0 md:flex-1 rounded-card px-6 py-5 overflow-hidden text-paper snap-start"
      style={{ background: 'linear-gradient(135deg, #E8672E, #FF6B2C 70%)' }}>
      <div className="relative z-10">
        <p className="font-display font-bold text-4xl tracking-tight leading-none flex items-baseline">
          24<span className="opacity-70 mx-0.5">/</span>7
        </p>
        <p className="tag-tab text-[9px] mt-2 opacity-80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulseGlow" />
          AUTOMATED INTAKE
        </p>
      </div>
      <p className="relative z-10 text-xs leading-relaxed opacity-90 max-w-[16ch]">
        No shift changes. No backlog window. Cases enter the queue the moment they land.
      </p>
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 34px)'
      }} />
    </div>
  )
}

export default function StatsBand() {
  return (
    <section className="relative bg-mist py-16 md:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10">
          <p className="tag-tab text-[10px] text-graphite mb-2">VERIFICATION AT SCALE</p>
          <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-ink tracking-tight">
            Every dial tells one part of the story
          </h2>
        </div>

        <HorizontalScroller
          ariaLabel="Verification stats"
          className="flex flex-row gap-4 md:overflow-visible pb-1 md:pb-0 snap-x snap-mandatory"
          arrowsClassName="md:hidden"
        >
          {DIALS.map((d) => (
            <StatDial key={d.label} {...d} />
          ))}
          <LiveIntakeCard />
        </HorizontalScroller>
      </div>
    </section>
  )
}
