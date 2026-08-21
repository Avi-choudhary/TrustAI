// Shared constants/helpers. Loaded via importScripts() in the background
// service worker and via a plain <script> tag in popup/options/result pages.

const TRUSTAI_DEFAULT_API_BASE = 'http://localhost:8000'

const TRUSTAI_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'heic']
const TRUSTAI_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']

// Same palette as the web app's RiskStamp component (src/index.css tokens).
const TRUSTAI_BUCKET_STYLES = {
  LOW: { color: '#087A5B', bg: '#E8F6F0', label: 'LOW RISK', sub: 'Likely authentic' },
  MEDIUM: { color: '#A56B00', bg: '#FFF4D8', label: 'MEDIUM RISK', sub: 'Review recommended' },
  HIGH: { color: '#D92D3A', bg: '#FDEBED', label: 'HIGH RISK', sub: 'Likely tampered' }
}

function trustaiGetExtension(url) {
  try {
    const clean = new URL(url).pathname
    const match = clean.match(/\.([a-z0-9]+)$/i)
    return match ? match[1].toLowerCase() : ''
  } catch {
    return ''
  }
}

// Decide whether a right-clicked link/page should go through the
// image-detection or document-detection pipeline.
function trustaiClassify(url, mimeType) {
  const ext = trustaiGetExtension(url)
  if (TRUSTAI_IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (TRUSTAI_DOCUMENT_EXTENSIONS.includes(ext)) return 'document'
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType === 'application/pdf' || mimeType.includes('officedocument') || mimeType.includes('msword')) {
      return 'document'
    }
  }
  // Unknown extension (e.g. a signed CDN URL with no file suffix) — default
  // to the document pipeline, which is the broader/safer of the two.
  return 'document'
}

function trustaiGuessFilename(url, mimeType, fallbackType) {
  try {
    const pathname = new URL(url).pathname
    const last = pathname.split('/').filter(Boolean).pop()
    if (last && last.includes('.')) return decodeURIComponent(last)
  } catch {
    // ignore, fall through to a generated name
  }
  const extFromMime = mimeType ? mimeType.split('/').pop() : ''
  const ext = extFromMime || (fallbackType === 'image' ? 'jpg' : 'pdf')
  return `trustai-${fallbackType}.${ext}`
}

async function trustaiGetApiBase() {
  const { apiBase } = await chrome.storage.sync.get({ apiBase: TRUSTAI_DEFAULT_API_BASE })
  return apiBase.replace(/\/+$/, '')
}
