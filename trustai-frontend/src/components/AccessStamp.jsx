export default function AccessStamp({ label, sub }) {
  return (
    <div className="flex flex-col items-center py-4 animate-stampDown" style={{ transformOrigin: 'center' }}>
      <div
        className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center text-center select-none"
        style={{
          border: '4px solid #FF6A2C',
          color: '#FF6A2C',
          transform: 'rotate(-8deg)',
          boxShadow: '0 0 40px -6px #FF6A2C'
        }}
      >
        <div className="absolute inset-[6px] rounded-full" style={{ border: '1.5px solid #FF6A2C', opacity: 0.55 }} />
        <span className="tag-tab text-[10px] tracking-[0.15em] mt-1">TrustAI</span>
        <span className="font-display font-bold text-base leading-tight mt-1 px-2">{label}</span>
        <span className="tag-tab text-[8px] tracking-[0.1em] mt-1 opacity-80">{sub}</span>
      </div>
    </div>
  )
}
