import { useState } from 'react'

const FAQS = [
  {
    q: 'Is a result a definitive fraud verdict?',
    a: 'No. TrustAI reports the likelihood of tampering or AI generation based on the signals it checks. Results are meant to guide a human reviewer, not replace one.'
  },
  {
    q: 'What file types are supported?',
    a: 'Images (JPG, PNG, WebP) and scanned documents such as PDFs, marksheets, and certificates. Deepfake screening runs automatically on image uploads where relevant.'
  },
  {
    q: 'Do you store the files I upload?',
    a: 'Only if you choose to save a case to your history log. Files run without an account, or explicitly discarded after review, are not retained.'
  },
  {
    q: 'How accurate is the detection?',
    a: 'Accuracy varies by signal and file type. Error Level Analysis and metadata checks are highly reliable on unedited-then-edited files; deepfake detection is newer and still labeled beta in every report.'
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes, individual checks are free to run. Team workspaces and bulk intake are part of paid plans.'
  }
]

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-mistDark py-5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-ink text-[15px]">{q}</span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-45 text-seal' : 'text-graphite'}`}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {isOpen && <p className="text-sm text-inkSoft mt-3 leading-relaxed pr-8">{a}</p>}
    </div>
  )
}

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="bg-paper py-20 md:py-24">
      <div className="max-w-2xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10">
          <p className="tag-tab text-[10px] text-graphite mb-2">QUESTIONS</p>
          <h2 className="font-display text-2xl md:text-[1.8rem] font-semibold text-ink tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div>
          {FAQS.map((f, i) => (
            <FAQItem
              key={f.q}
              q={f.q}
              a={f.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
