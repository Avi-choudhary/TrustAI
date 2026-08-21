import { Link } from 'react-router-dom'
import Logo from '../Logo'

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: ['Document Check', 'Image Forensics', 'Deepfake Detection', 'Pricing']
  },
  {
    heading: 'Organizations',
    links: ['Newsrooms', 'Universities & admissions', 'HR & recruiting', 'Legal & insurance']
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Press']
  },
  {
    heading: 'Resources',
    links: ['Help center', 'Case studies', 'Trust & safety', 'System status']
  }
]

const SOCIALS = [
  { label: 'X', path: 'M3 3l7.5 9.5L3.5 21h2.2l6.2-7.1L17 21h4l-7.9-10L20.7 3h-2.2l-5.7 6.5L7 3H3z' },
  { label: 'LinkedIn', path: 'M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2 3.76-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z' },
  { label: 'GitHub', path: 'M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.69 0 3.84-2.35 4.68-4.58 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z' }
]

export default function LandingFooter() {
  return (
    <>
      {/* Closing CTA banner */}
      <section className="bg-[#171513]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
          <h2 className="font-display text-3xl md:text-[2.75rem] font-semibold text-white tracking-tight leading-[1.1]">
            Verify your first file in under a minute.
          </h2>
          <p className="text-[#C5BEB6] mt-4 max-w-md mx-auto">
            No credit card, no install. Drop in an image or scanned document and see the report.
          </p>
          <Link
            to="/check"
            className="inline-flex mt-8 items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-seal hover:bg-sealHover hover:-translate-y-px transition-all shadow-softLg"
          >
            Start a free check
          </Link>
        </div>
      </section>

      {/* Footer links */}
      <footer className="bg-[#171513] border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Logo size={26} />
                <span className="font-display font-semibold text-white">TrustAI</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed max-w-[220px]">
                Document and media authenticity verification, built with forensic examiners.
              </p>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="tag-tab text-[10px] text-white/40 mb-3.5">{col.heading.toUpperCase()}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) =>
                    link === 'Pricing' ? (
                      <li key={link}>
                        <Link to="/pricing" className="text-sm text-white/65 hover:text-white transition-colors">
                          {link}
                        </Link>
                      </li>
                    ) : (
                      <li key={link}>
                        <a href="#" className="text-sm text-white/65 hover:text-white transition-colors">
                          {link}
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-7 border-t border-white/10 flex flex-col-reverse md:flex-row items-center justify-between gap-6">
            <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} TrustAI. Not a definitive fraud verdict.</p>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                {SOCIALS.map((s) => (
                  <a key={s.label} href="#" aria-label={s.label} className="text-white/50 hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-white/40">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
