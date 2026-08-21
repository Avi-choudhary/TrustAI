import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, clearHistory } from '../utils/storage'

const BUCKET_TEXT = {
  LOW: 'text-low',
  MEDIUM: 'text-medium',
  HIGH: 'text-high'
}
const BUCKET_BG = {
  LOW: 'bg-lowSoft',
  MEDIUM: 'bg-mediumSoft',
  HIGH: 'bg-highSoft'
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleClear = () => {
    clearHistory()
    setHistory([])
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="tag-tab text-xs text-cyan mb-2">CASE LOG</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Past checks on this device</h1>
          <p className="text-sm text-inkSoft mt-1">
            Stored locally in this browser for the demo — no account required yet.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="tag-tab text-xs text-graphite hover:text-high transition-colors underline underline-offset-2"
          >
            CLEAR LOG
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="border border-dashed border-graphite/35 rounded-sm p-12 text-center">
          <p className="font-medium mb-1.5 text-ink">No checks logged yet</p>
          <p className="text-sm text-inkSoft mb-5">Run your first verification to see it appear here.</p>
          <Link to="/check" className="tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-2.5 rounded-sm inline-block">
            NEW CHECK
          </Link>
        </div>
      ) : (
        <div className="border border-graphite/25 rounded-sm overflow-hidden bg-paperDark/50">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 tag-tab text-[10px] text-graphite border-b hairline">
            <span>FILE</span>
            <span>SUBMITTED</span>
            <span>VERDICT</span>
          </div>
          {history.map((item) => (
            <Link
              key={item.id}
              to={`/results/${item.id}`}
              className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-center border-b hairline last:border-b-0 hover:bg-paper/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium truncate text-ink">{item.fileName}</p>
                <p className="tag-tab text-[10px] text-graphite case-number">{item.id}</p>
              </div>
              <p className="text-sm text-inkSoft whitespace-nowrap">
                {new Date(item.submittedAt).toLocaleDateString()}
              </p>
              <span
                className={`tag-tab text-[10px] font-semibold px-2.5 py-1 rounded-sm whitespace-nowrap ${BUCKET_TEXT[item.riskBucket]} ${BUCKET_BG[item.riskBucket]}`}
              >
                {item.riskBucket} · {item.riskScore}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
