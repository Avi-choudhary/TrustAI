const BUCKET_STYLES = {
  LOW: { color: '#34D399', label: 'LOW RISK', sub: 'LIKELY AUTHENTIC' },
  MEDIUM: { color: '#FBBF24', label: 'MEDIUM RISK', sub: 'REVIEW RECOMMENDED' },
  HIGH: { color: '#FB6161', label: 'HIGH RISK', sub: 'LIKELY TAMPERED' }
}

const GOLD = '#FF6A2C'

export default function RiskStamp({ bucket, score }) {
  const style = BUCKET_STYLES[bucket] ?? BUCKET_STYLES.MEDIUM

  return (
    <div className="flex flex-col items-center animate-stampDown" style={{ transformOrigin: 'center' }}>
      <div
        className="relative w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center text-center select-none bg-paperDark"
        style={{
          border: `3px solid ${GOLD}`,
          transform: 'rotate(-6deg)',
          boxShadow: `0 0 0 1px ${GOLD}, 0 6px 20px -8px rgba(31,26,10,0.35)`
        }}
      >
        <div
          className="absolute inset-[7px] rounded-full"
          style={{ border: `1px solid ${GOLD}`, opacity: 0.6 }}
        />
        <span className="eyebrow-serif text-[11px] tracking-[0.1em] mt-1" style={{ color: GOLD }}>
          VERIFIED BY
        </span>
        <span className="font-display font-bold text-lg md:text-xl leading-tight mt-1" style={{ color: style.color }}>
          {style.label}
        </span>
        <span className="eyebrow-serif text-[10px] mt-1" style={{ color: style.color }}>
          Score {score}/100
        </span>
      </div>
    </div>
  )
}
