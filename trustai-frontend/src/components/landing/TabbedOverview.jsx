import { useState } from 'react'

const TABS = [
  {
    key: 'document',
    label: 'Document Check',
    heading: 'Catch altered scans before they\u2019re trusted',
    body: 'OCR and layout analysis compare font weight, baseline alignment, and letter spacing across a document to find fields that were edited after the fact.',
    bullets: [
      'Flags font and spacing inconsistencies field-by-field',
      'Cross-checks table grids and baselines',
      'Works on PDFs, scans, and photographed pages'
    ]
  },
  {
    key: 'image',
    label: 'Image Forensics',
    heading: 'Find edits a screenshot can\u2019t hide',
    body: 'Error Level Analysis maps recompression artifacts across an image, exposing regions that were pasted, cloned, or re-saved separately from the rest of the file.',
    bullets: [
      'Highlights localized edit zones with a confidence score',
      'Detects copy-move and splicing patterns',
      'Reads EXIF for camera, software, and timestamp history'
    ]
  },
  {
    key: 'deepfake',
    label: 'Deepfake Detection',
    heading: 'Screen faces and voices for synthesis',
    body: 'A dedicated model checks for the artifacts left behind by generative face-swap and voice-cloning tools, returned as one more signal alongside the rest of the report.',
    bullets: [
      'Frame-level face consistency scoring',
      'Voice synthesis screening on audio tracks',
      'Currently in beta \u2014 flagged clearly in every report'
    ]
  },
  {
    key: 'history',
    label: 'Case History',
    heading: 'A searchable record of every check',
    body: 'Every verification is saved with a case number, timestamp, and the full signal breakdown, so you can find it again in seconds.',
    bullets: [
      'Filter by risk bucket, file type, or date',
      'Export a case as a shareable report',
      'Shared team workspaces with reviewer sign-off'
    ]
  }
]

export default function TabbedOverview() {
  const [active, setActive] = useState(TABS[0].key)
  const tab = TABS.find((t) => t.key === active)

  return (
    <section className="bg-paper py-20 md:py-24 border-t border-ink/[0.08]">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10">
          <p className="tag-tab text-[10px] text-graphite mb-2">FEATURE OVERVIEW</p>
          <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-ink tracking-tight">
            One platform, four ways to verify
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                active === t.key ? 'bg-primary text-white' : 'bg-mist text-inkSoft hover:text-ink hover:bg-mistDark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center bg-mist rounded-feature p-8 md:p-12">
          <div>
            <div className="rounded-card bg-paperDark shadow-soft ring-1 ring-mistDark aspect-[4/3] p-6 md:p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-high/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-medium/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-low/60" />
                <span className="tag-tab text-[9px] text-graphite ml-2 truncate">{tab.key}_check.pdf</span>
              </div>

              <div className="space-y-2.5">
                <div className="h-2.5 rounded-full bg-ink/10 w-full" />
                <div className="h-2.5 rounded-full bg-ink/10 w-5/6" />
                <div className="h-2.5 rounded-full bg-ink/10 w-full" />
              </div>

              <div className="mt-5 rounded-xl ring-1 ring-seal/35 bg-sealSoft px-4 py-3 flex items-center justify-between gap-3">
                <span className="tag-tab text-[9px] text-seal truncate">{tab.label.toUpperCase()}</span>
                <span className="tag-tab text-[9px] text-white bg-seal px-2 py-1 rounded-full shrink-0">RUNNING…</span>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="h-2.5 rounded-full bg-ink/10 w-2/3" />
                <div className="h-2.5 rounded-full bg-ink/10 w-1/2" />
              </div>

              <div className="mt-auto pt-5 flex items-center gap-2 tag-tab text-[9px] text-graphite">
                <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
                ANALYZING SIGNALS
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-ink tracking-tight">{tab.heading}</h3>
            <p className="text-inkSoft mt-3 leading-relaxed">{tab.body}</p>
            <ul className="mt-5 space-y-2.5">
              {tab.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A2C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="leading-snug">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
