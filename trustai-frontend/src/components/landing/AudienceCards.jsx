const AUDIENCES = [
  {
    title: 'Newsrooms & journalists',
    desc: 'Check source images before they run, with an audit trail if a source is questioned later.',
    tags: ['ELA', 'Deepfake', 'GPS trace'],
    gradient: 'linear-gradient(135deg, #FF8A5B, #FFB38F)',
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=640&q=70&auto=format&fit=crop',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5a1.5 1.5 0 011.5-1.5h2l1-2h9l1 2h2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z" />
        <circle cx="12" cy="13" r="3.6" />
      </svg>
    )
  },
  {
    title: 'Universities & admissions',
    desc: 'Catch altered transcripts and marksheets in an intake queue, without slowing down every legitimate file.',
    tags: ['OCR', 'Metadata', 'Case log'],
    gradient: 'linear-gradient(135deg, #FFD18A, #FFE1A8)',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=640&q=70&auto=format&fit=crop',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
        <path d="M6.5 9.75V15c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V9.75" />
        <path d="M21 8v6" />
      </svg>
    )
  },
  {
    title: 'HR & recruiting teams',
    desc: 'Screen submitted credentials and ID documents as part of the application flow, not after an offer is signed.',
    tags: ['Metadata', 'OCR'],
    gradient: 'linear-gradient(135deg, #FFB45C, #FF8A3D)',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=640&q=70&auto=format&fit=crop',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M9 6V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V6" />
        <circle cx="12" cy="12.5" r="2" />
        <path d="M8.5 17.5c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5" />
      </svg>
    )
  }
]

export default function AudienceCards() {
  return (
    <section id="audiences" className="bg-paper py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-12">
          <p className="tag-tab text-[10px] text-graphite mb-2">BUILT FOR YOUR TEAM</p>
          <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-ink tracking-tight">
            Verification, shaped to how you review
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl bg-paperDark border border-ink/[0.07] overflow-hidden hover:shadow-soft transition-shadow">
              <div className="h-36 relative" style={{ background: a.gradient }}>
                <img
                  src={a.image}
                  alt={a.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div className="absolute inset-0" style={{ background: a.gradient, opacity: 0.22 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                  {a.icon}
                </div>
              </div>
              <div className="p-6 bg-paperDark">
                <h3 className="font-display font-semibold text-lg text-ink">{a.title}</h3>
                <p className="text-sm text-inkSoft mt-2 leading-relaxed">{a.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {a.tags.map((t) => (
                    <span key={t} className="tag-tab text-[9px] px-2 py-1 rounded-full bg-mist text-inkSoft">
                      {t.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
