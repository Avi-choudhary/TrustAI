// Simple localStorage-backed history log.
// Swap for real backend calls once auth/history endpoints exist —
// keep the same function signatures so pages/HistoryPage.jsx doesn't change.

const KEY = 'trustai_history_v1'

export function saveToHistory(result) {
  const existing = getHistory()
  // Store a lightweight record only — do NOT persist the base64 previewUrl.
  // localStorage caps out around 5-10MB per origin, and a single uploaded
  // image or scan can still blow past that in one save, which was
  // silently failing or throwing a quota error for larger uploads.
  // ResultsPage still gets the full result (including previewUrl) via
  // router state right after upload; only the history list drops it.
  const { previewUrl, ...lightweightResult } = result
  const record = {
    id: result.id,
    fileName: result.fileName,
    fileType: result.fileType,
    submittedAt: result.submittedAt,
    riskScore: result.riskScore,
    riskBucket: result.riskBucket,
    full: lightweightResult
  }
  const updated = [record, ...existing].slice(0, 50)

  try {
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch (err) {
    // Quota exceeded (e.g. very large or many history entries) — drop the
    // oldest entries and retry once instead of crashing the upload flow.
    console.warn('History storage quota exceeded, trimming older entries', err)
    try {
      localStorage.setItem(KEY, JSON.stringify(updated.slice(0, 10)))
    } catch {
      console.warn('Still over quota after trimming — skipping history save for this item')
    }
  }
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getHistoryItem(id) {
  return getHistory().find((h) => h.id === id) || null
}

export function clearHistory() {
  localStorage.removeItem(KEY)
}
