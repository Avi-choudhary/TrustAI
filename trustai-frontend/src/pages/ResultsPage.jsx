import { useLocation, useParams, Link } from 'react-router-dom'
import RiskStamp from '../components/RiskStamp'
import EvidenceTag from '../components/EvidenceTag'
import ImageHotzoneOverlay from '../components/ImageHotzoneOverlay'
import GraphBreakdown from '../components/GraphBreakdown'
import BlockchainReceipt from '../components/BlockchainReceipt'
import { getHistoryItem } from '../utils/storage'
import { downloadVerificationReport } from '../utils/verificationReportPdf'

export default function ResultsPage() {
  const { id } = useParams()
  const location = useLocation()

  const result = location.state?.result ?? getHistoryItem(id)?.full

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="tag-tab text-xs text-graphite mb-2">NOT FOUND</p>
        <h1 className="text-xl font-semibold mb-3 text-ink">No report found for this case</h1>
        <p className="text-inkSoft mb-6">It may have been cleared, or the link is out of date.</p>
        <Link to="/check" className="tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-2.5 rounded-sm inline-block">
          START A NEW CHECK
        </Link>
      </div>
    )
  }

  const elaSignal = result.signals.find((s) => s.type === 'ela')
  const hotzones = elaSignal?.hotzones ?? []

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="eyebrow-serif text-sm text-cyan case-number mb-1">{result.id}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight truncate max-w-md text-ink">{result.fileName}</h1>
          <p className="text-sm text-inkSoft mt-1">
            Submitted {new Date(result.submittedAt).toLocaleString()} · {result.fileType.toUpperCase()}
          </p>
        </div>
        <Link
          to="/check"
          className="tag-tab text-xs font-semibold border border-cyan/50 text-cyan px-4 py-2 rounded-sm hover:bg-cyan hover:text-paper transition-colors"
        >
          NEW CHECK
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-8 items-start">
        <div className="space-y-6">
          <div>
            <p className="eyebrow-serif text-sm text-graphite mb-2">Submitted evidence</p>
            <ImageHotzoneOverlay
              previewUrl={result.previewUrl}
              hotzones={hotzones}
              fileType={result.fileType}
              fileName={result.fileName}
            />
          </div>

          <div>
            <p className="eyebrow-serif text-sm text-graphite mb-2">Detection signals</p>
            <div className="space-y-2.5">
              {result.signals.map((signal) => (
                <EvidenceTag key={signal.type} signal={signal} />
              ))}
            </div>
          </div>

          <GraphBreakdown
            nodeActivations={result.graphNodeActivations}
            corroborationBonus={result.graphCorroborationBonus}
          />

          <BlockchainReceipt
            documentHash={result.documentHash}
            receipt={result.blockchainReceipt}
            verdict={result.verdict}
          />

          <p className="text-xs text-graphite leading-relaxed border-t hairline pt-4">
            This score reflects likelihood of digital tampering based on automated checks — it is
            not a definitive fraud accusation. Use it alongside manual review and, where possible,
            verification with the issuing authority.
          </p>
        </div>

        <div className="md:sticky md:top-24 flex flex-col items-center gap-4">
          <RiskStamp bucket={result.riskBucket} score={result.riskScore} />
          <button
            onClick={() => downloadVerificationReport(result)}
            className="tag-tab text-xs w-full font-semibold border border-graphite/40 text-ink px-4 py-2.5 rounded-sm hover:border-cyan/60 hover:text-cyan transition-colors"
          >
            DOWNLOAD PDF REPORT
          </button>
        </div>
      </div>
    </div>
  )
}
