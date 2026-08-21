import HorizontalScroller from '../HorizontalScroller'

const REVIEWS = [
  {
    name: 'Priya Nathan',
    role: 'Registrar, State University',
    quote: 'We used to hold admissions files for a week for manual review. Now the flagged transcripts surface in under a minute, with the exact field highlighted.',
    rating: 5,
    time: '2 weeks ago',
    avatar: 'https://i.pravatar.cc/80?img=44'
  },
  {
    name: 'Marcus Deel',
    role: 'Photo editor, wire newsroom',
    quote: 'The ELA overlay is the first thing I check before a submitted image runs. It caught a recompressed crop our own process missed.',
    rating: 5,
    time: '1 month ago',
    avatar: 'https://i.pravatar.cc/80?img=53'
  },
  {
    name: 'Sofia Reyes',
    role: 'HR compliance lead',
    quote: 'Candidates upload straight into our applicant tracker now. The case log gives us something to point to when a credential gets questioned later.',
    rating: 4,
    time: '3 weeks ago',
    avatar: 'https://i.pravatar.cc/80?img=29'
  },
  {
    name: 'Daniel Okafor',
    role: 'Claims manager, insurance',
    quote: 'Metadata timelines alone have paid for the subscription \u2014 edit dates after the incident date are an easy call once you can see them.',
    rating: 5,
    time: '5 days ago',
    avatar: 'https://i.pravatar.cc/80?img=13'
  }
]

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < rating ? '#FF6B2C' : 'none'} stroke="#FF6B2C" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section className="relative bg-[#1B1917] py-20 md:py-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '20px 20px' }}
      />
      <div className="max-w-6xl mx-auto px-5 md:px-8 relative">
        <div className="text-center mb-12">
          <p className="tag-tab text-[10px] text-[#B5AEA6] mb-2">TRUSTED BY REVIEW TEAMS</p>
          <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-[#F7F4EF] tracking-tight">
            What verifiers are saying
          </h2>
        </div>

        <HorizontalScroller ariaLabel="Customer testimonials" variant="dark" className="flex gap-5 pb-1 snap-x snap-mandatory">
          {REVIEWS.map((r) => (
            <div
              key={r.name}
              className="snap-start shrink-0 w-[300px] sm:w-[340px] bg-[#211F1C] rounded-2xl shadow-soft ring-1 ring-white/[0.08] p-6 flex flex-col"
            >
              <Stars rating={r.rating} />
              <p className="text-sm text-[#F7F4EF] mt-4 leading-relaxed flex-1">&ldquo;{r.quote}&rdquo;</p>
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={r.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/[0.08]" />
                  <div>
                    <p className="text-sm font-semibold text-[#F7F4EF]">{r.name}</p>
                    <p className="text-xs text-[#B5AEA6]">{r.role}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#B5AEA6] shrink-0">{r.time}</p>
              </div>
            </div>
          ))}
        </HorizontalScroller>
      </div>
    </section>
  )
}
