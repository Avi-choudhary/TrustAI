import { useState } from 'react'
import { Link } from 'react-router-dom'

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

// Dummy bookmarked reports until saving/starring a result is wired up to
// a real account backend — same shape HistoryPage renders, plus savedAt.
const MOCK_SAVED = [
  {
    id: 'TRA-M2K9F1',
    fileName: 'internship_offer_letter.pdf',
    riskBucket: 'HIGH',
    riskScore: 78,
    savedAt: '2026-08-11T09:14:00Z'
  },
  {
    id: 'TRA-M1P3A7',
    fileName: 'team_photo_conference.jpg',
    riskBucket: 'LOW',
    riskScore: 12,
    savedAt: '2026-07-29T15:40:00Z'
  }
]

export default function SavedReportsPage() {
  const [saved, setSaved] = useState(MOCK_SAVED)

  const handleRemove = (id) => {
    setSaved((rows) => rows.filter((r) => r.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="mb-6">
        <p className="tag-tab text-xs text-cyan mb-2">BOOKMARKS</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Saved reports</h1>
        <p className="text-sm text-inkSoft mt-1">Reports you've bookmarked for quick reference later.</p>
      </div>

      {saved.length === 0 ? (
        <div className="border border-dashed border-graphite/35 rounded-sm p-12 text-center">
          <p className="font-medium mb-1.5 text-ink">No saved reports yet</p>
          <p className="text-sm text-inkSoft mb-5">Bookmark a result from its report page to find it here.</p>
          <Link
            to="/history"
            className="tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-2.5 rounded-sm inline-block"
          >
            VIEW HISTORY LOG
          </Link>
        </div>
      ) : (
        <div className="border border-graphite/25 rounded-sm overflow-hidden bg-paperDark/50">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 tag-tab text-[10px] text-graphite border-b hairline">
            <span>FILE</span>
            <span>SAVED</span>
            <span>VERDICT</span>
            <span className="sr-only">Remove</span>
          </div>
          {saved.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center border-b hairline last:border-b-0 hover:bg-paper/60 transition-colors"
            >
              <Link to={`/results/${item.id}`} className="min-w-0">
                <p className="font-medium truncate text-ink">{item.fileName}</p>
                <p className="tag-tab text-[10px] text-graphite case-number">{item.id}</p>
              </Link>
              <p className="text-sm text-inkSoft whitespace-nowrap">{new Date(item.savedAt).toLocaleDateString()}</p>
              <span
                className={`tag-tab text-[10px] font-semibold px-2.5 py-1 rounded-sm whitespace-nowrap ${BUCKET_TEXT[item.riskBucket]} ${BUCKET_BG[item.riskBucket]}`}
              >
                {item.riskBucket} · {item.riskScore}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${item.fileName} from saved reports`}
                className="tag-tab text-[10px] text-graphite hover:text-high transition-colors"
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
