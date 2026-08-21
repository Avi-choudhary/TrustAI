const params = new URLSearchParams(location.search)
const jobId = params.get('job')

const loadingState = document.getElementById('loadingState')
const errorState = document.getElementById('errorState')
const resultState = document.getElementById('resultState')
const errorText = document.getElementById('errorText')
const retryBtn = document.getElementById('retryBtn')

function show(state) {
  loadingState.classList.toggle('hidden', state !== 'loading')
  errorState.classList.toggle('hidden', state !== 'error')
  resultState.classList.toggle('hidden', state !== 'done')
}

function renderResult(job) {
  const result = job.result
  const bucket = TRUSTAI_BUCKET_STYLES[result.riskBucket] || TRUSTAI_BUCKET_STYLES.MEDIUM

  const badge = document.getElementById('riskBadge')
  badge.style.background = bucket.bg
  badge.style.color = bucket.color
  document.getElementById('riskScoreNum').textContent = Math.round(result.riskScore)

  document.getElementById('riskLabel').textContent = bucket.label
  document.getElementById('riskLabel').style.color = bucket.color
  document.getElementById('riskSub').textContent = bucket.sub
  document.getElementById('fileName').textContent = result.fileName || ''

  if (result.previewUrl) {
    const previewSection = document.getElementById('previewSection')
    const img = document.getElementById('previewImg')
    // previewUrl may be a relative /files/... path from a local backend —
    // resolve it against the API base so it always loads.
    img.src = result.previewUrl
    img.onerror = () => previewSection.classList.add('hidden')
    previewSection.classList.remove('hidden')
  }

  const list = document.getElementById('signalsList')
  list.innerHTML = ''
  ;(result.signals || []).forEach((signal) => {
    const el = document.createElement('div')
    el.className = 'signal'
    const details = (signal.details || [])
      .map((d) => `<li>${escapeHtml(d)}</li>`)
      .join('')
    el.innerHTML = `
      <div class="signal-dot ${signal.status}"></div>
      <div>
        <div class="signal-label">${escapeHtml(signal.label)}</div>
        <div class="signal-summary">${escapeHtml(signal.summary)}</div>
        ${details ? `<ul class="signal-details">${details}</ul>` : ''}
      </div>
    `
    list.appendChild(el)
  })

  if (result.verdict) {
    const verdictSection = document.getElementById('verdictSection')
    document.getElementById('verdictBody').innerHTML = `
      <p><b>${escapeHtml(result.verdict)}</b>${
        result.confidence != null ? ` · ${Math.round(result.confidence * 100)}% confidence` : ''
      }</p>
      ${result.documentType ? `<p>Document type: ${escapeHtml(result.documentType)}</p>` : ''}
    `
    verdictSection.classList.remove('hidden')
  }

  show('done')
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

async function loadJob() {
  if (!jobId) {
    errorText.textContent = 'No check was started.'
    show('error')
    return
  }
  const stored = await chrome.storage.session.get(jobId)
  const job = stored[jobId]
  if (!job) {
    errorText.textContent = 'This check could not be found (it may have expired).'
    show('error')
    return
  }
  if (job.status === 'loading') {
    show('loading')
  } else if (job.status === 'error') {
    errorText.textContent = job.message || 'Something went wrong.'
    show('error')
  } else if (job.status === 'done') {
    renderResult(job)
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'session' && jobId in changes) {
    loadJob()
  }
})

retryBtn.addEventListener('click', () => location.reload())

loadJob()
