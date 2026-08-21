// Visualizes VerificationResult.graphNodeActivations / graphCorroborationBonus
// — the output of the backend's graph-based risk fusion engine
// (aggregation/graph_risk_engine.py). Renders one bar per evidence node
// (metadata / ela / ocr / spectral) plus how much of the final score came
// from cross-signal corroboration, if any.
//
// Both fields are optional on the response: they're `None` whenever the
// engine found nothing to corroborate (zero or one signal flagged), so
// this component renders a quiet empty state in that case instead of an
// empty graph.

const TYPE_ACCENT = {
  metadata: '#FF6A2C',
  ela: '#FFB37A',
  ocr: '#FBBF24',
  spectral: '#FB6161'
}

const TYPE_LABEL = {
  metadata: 'Provenance Trace Analysis',
  ela: 'Compression Residual Analysis',
  ocr: 'OCR / Layout',
  spectral: 'Spectral Consistency Analysis'
}

export default function GraphBreakdown({ nodeActivations, corroborationBonus }) {
  const hasActivations = nodeActivations && Object.keys(nodeActivations).length > 0
  const bonus = corroborationBonus ?? 0

  if (!hasActivations) {
    return (
      <div>
        <p className="eyebrow-serif text-sm text-graphite mb-2">Cross-signal corroboration</p>
        <div className="border border-graphite/25 rounded-sm bg-paperDark/50 px-4 py-3.5">
          <p className="text-sm text-inkSoft">
            Not enough flagged signals to graph corroboration yet — this shows up once two or
            more detection signals activate together.
          </p>
        </div>
      </div>
    )
  }

  const nodes = Object.entries(nodeActivations).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <p className="eyebrow-serif text-sm text-graphite mb-2">Cross-signal corroboration</p>
      <div className="border border-graphite/25 rounded-sm bg-paperDark/50 px-4 py-3.5 space-y-3">
        {nodes.map(([node, value]) => {
          const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
          const accent = TYPE_ACCENT[node] ?? '#7A736C'
          return (
            <div key={node}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-ink">{TYPE_LABEL[node] ?? node}</span>
                <span className="tag-tab text-xs text-graphite">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-graphite/15 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: accent }}
                />
              </div>
            </div>
          )
        })}

        <div className="border-t hairline pt-3 flex items-center justify-between">
          <span className="text-sm text-ink">Corroboration bonus</span>
          <span className="tag-tab text-xs font-semibold text-high">
            {bonus > 0 ? `+${bonus.toFixed(1)} pts` : '0 pts'}
          </span>
        </div>
        <p className="text-xs text-graphite leading-relaxed">
          Score added because related evidence activated together — for example, compression
          residuals and spectral anomalies corroborating each other.
        </p>
      </div>
    </div>
  )
}
