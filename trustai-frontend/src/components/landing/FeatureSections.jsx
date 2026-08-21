import { Link } from 'react-router-dom'

function HotzoneMock() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl bg-paperDark shadow-softLg ring-1 ring-ink/[0.08] p-5 overflow-hidden">
      {/* mini app chrome so the panel reads as a real viewer, not a floating card */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-high/40" />
          <span className="w-2 h-2 rounded-full bg-medium/40" />
          <span className="w-2 h-2 rounded-full bg-low/40" />
        </div>
        <div className="tag-tab text-[9px] text-graphite px-2 py-1 rounded-full bg-mist">govt_id_scan.jpg</div>
      </div>

      <div className="h-[calc(100%-2rem)] w-full rounded-xl bg-gradient-to-br from-[#FBFAF8] to-[#F3EFE8] relative ring-1 ring-ink/[0.06]">
        <div className="absolute inset-0 opacity-50 rounded-xl overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(23,21,19,0.035) 23px)' }} />
        {/* scanning sweep for a forensic feel */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-seal/0 via-seal/[0.06] to-seal/0 animate-scanline" />
        </div>

        {/* photo + name block, styled like an actual ID card */}
        <div className="absolute top-[6%] left-[6%] w-[26%] h-[28%] rounded-lg bg-gradient-to-br from-sealSoft to-violetSoft flex items-center justify-center ring-1 ring-ink/[0.06] shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-seal/70">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute top-[8%] left-[36%] w-[42%] space-y-2">
          <div className="w-[85%] h-[9%] rounded-full bg-ink/[0.14]" />
          <p className="tag-tab text-[7.5px] text-graphiteFaint pt-1">DATE OF BIRTH</p>
          <div className="w-[55%] h-[7%] rounded-full bg-ink/[0.09]" />
        </div>

        <div className="absolute top-[40%] left-[6%] w-[88%] h-px bg-ink/[0.08]" />

        <div className="absolute top-[45%] left-[6%] w-[40%]">
          <p className="tag-tab text-[7.5px] text-graphiteFaint mb-1.5">ISSUING AUTHORITY</p>
          <div className="w-[80%] h-[10%] rounded-full bg-ink/[0.08]" />
        </div>
        <div className="absolute top-[45%] left-[52%] w-[40%]">
          <p className="tag-tab text-[7.5px] text-graphiteFaint mb-1.5">EXPIRES</p>
          <div className="w-[70%] h-[10%] rounded-full bg-ink/[0.08]" />
        </div>

        <div className="absolute top-[74%] left-[6%] w-[38%] h-[15%] rounded-md bg-white ring-1 ring-ink/[0.08] px-2.5 flex items-center shadow-sm">
          <svg viewBox="0 0 100 30" className="w-full h-4 text-seal/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 22c6-14 10-14 14 0s10 14 16 0 10-14 16 0 10 14 16 0 10-14 14 0" />
          </svg>
        </div>
        <div className="absolute top-[74%] left-[50%] w-[44%] h-[15%] rounded-md bg-white ring-1 ring-ink/[0.08] px-3 flex flex-col justify-center gap-1 shadow-sm">
          <div className="w-[70%] h-[14%] rounded-full bg-ink/[0.1]" />
          <div className="w-[45%] h-[14%] rounded-full bg-ink/[0.07]" />
        </div>

        <div className="absolute top-[5%] left-[32%] w-[52%] h-[24%] border-2 border-high rounded-md bg-highSoft/40 animate-fadeUp shadow-[0_0_0_4px_rgba(217,45,58,0.06)]">
          <span className="absolute -top-6 left-0 tag-tab text-[9px] bg-high text-white px-2 py-1 rounded-sm whitespace-nowrap shadow-sm">FLAG &middot; 82%</span>
        </div>
        <div className="absolute top-[72%] left-[4%] w-[42%] h-[18%] border-2 border-medium rounded-md bg-mediumSoft/40 shadow-[0_0_0_4px_rgba(165,107,0,0.06)]">
          <span className="absolute -top-6 left-0 tag-tab text-[9px] bg-medium text-white px-2 py-1 rounded-sm whitespace-nowrap shadow-sm">FLAG &middot; 61%</span>
        </div>
      </div>
    </div>
  )
}

function HistoryMock() {
  const rows = [
    { id: 'TRA-9F2K1', bucket: 'LOW', file: 'employment_letter.pdf' },
    { id: 'TRA-8B7Q4', bucket: 'HIGH', file: 'transcript_scan.pdf' },
    { id: 'TRA-7C1M0', bucket: 'MEDIUM', file: 'id_photo.jpg' },
    { id: 'TRA-6A9X2', bucket: 'LOW', file: 'contract_final.pdf' }
  ]
  const colors = { LOW: 'text-low bg-lowSoft', MEDIUM: 'text-medium bg-mediumSoft', HIGH: 'text-high bg-highSoft' }
  return (
    <div className="w-full rounded-2xl bg-paperDark shadow-softLg ring-1 ring-ink/[0.08] p-5">
      <p className="tag-tab text-[10px] text-graphite mb-3">RECENT CASES</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-mist/70 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate blur-[3px] select-none">{r.file}</p>
              <p className="tag-tab text-[9px] text-graphite mt-0.5">{r.id}</p>
            </div>
            <span className={`tag-tab text-[9px] px-2 py-1 rounded-full shrink-0 ${colors[r.bucket]}`}>{r.bucket}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    id: 'metadata-check',
    eyebrow: 'IMAGE & DOCUMENT FORENSICS',
    heading: 'See exactly what changed, and where',
    body: 'Error Level Analysis and metadata timelines pinpoint the regions and edit history behind a suspicious file, so you\u2019re never just told to trust a score.',
    bullets: [
      'Pixel-level analysis flags recompressed regions',
      'Metadata timeline surfaces edits made after the stated issue date',
      'Hotzones are drawn directly on the file, so you see the flag, not just read it'
    ],
    cta: 'Run a check',
    to: '/check',
    Visual: HotzoneMock,
    imageSide: 'right'
  },
  {
    id: 'case-history',
    eyebrow: 'CASE MANAGEMENT',
    heading: 'Every case gets a paper trail',
    body: 'Each verification is logged with a case number, timestamp, and full signal breakdown &mdash; searchable later by anyone on your team.',
    bullets: [
      'Full case log with exportable reports',
      'Shared workspaces for review and sign-off',
      'Nothing is deleted until you decide it should be'
    ],
    cta: 'View case history',
    to: '/history',
    Visual: HistoryMock,
    imageSide: 'left'
  }
]

function FeatureRow({ eyebrow, heading, body, bullets, cta, to, Visual, imageSide }) {
  const imageFirst = imageSide === 'left'
  return (
    <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center py-14 md:py-16">
      <div className={imageFirst ? 'md:order-1' : 'md:order-2'}>
        <div className="relative">
          <div className={`pointer-events-none absolute -z-10 ${imageFirst ? '-left-10' : '-right-10'} -top-10 w-64 h-64 rounded-full bg-sealSoft opacity-60 blur-2xl`} />
          <Visual />
        </div>
      </div>
      <div className={imageFirst ? 'md:order-2' : 'md:order-1'}>
        <p className="tag-tab text-[10px] text-seal mb-3">{eyebrow}</p>
        <h3 className="font-display text-2xl md:text-[1.75rem] font-semibold text-ink tracking-tight leading-tight">
          {heading}
        </h3>
        <p className="text-inkSoft mt-4 leading-relaxed">{body}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A2C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>
        <Link
          to={to}
          className="inline-flex items-center gap-2 mt-7 px-5 py-2.5 rounded-full text-sm font-semibold text-ink border border-mistDark hover:bg-sealSoft hover:border-seal transition-colors"
        >
          {cta} &rarr;
        </Link>
      </div>
    </div>
  )
}

export default function FeatureSections() {
  return (
    <section id="overview">
      {/* Forensics — white surface */}
      <div className="bg-paper">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <FeatureRow {...SECTIONS[0]} />
        </div>
      </div>
      {/* Case management — warm ivory surface, per the visual flow */}
      <div className="bg-paper border-t border-ink/[0.06]">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <FeatureRow {...SECTIONS[1]} />
        </div>
      </div>
    </section>
  )
}
