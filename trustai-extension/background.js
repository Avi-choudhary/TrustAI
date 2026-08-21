importScripts('shared.js')

const MENU_IMAGE = 'trustai-check-image'
const MENU_LINK = 'trustai-check-link'
const MENU_PAGE_PDF = 'trustai-check-page-pdf'

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IMAGE,
      title: 'Check image with TrustAI',
      contexts: ['image']
    })
    chrome.contextMenus.create({
      id: MENU_LINK,
      title: 'Check with TrustAI',
      contexts: ['link']
    })
    chrome.contextMenus.create({
      id: MENU_PAGE_PDF,
      title: 'Check this PDF with TrustAI',
      contexts: ['page'],
      documentUrlPatterns: ['*://*/*.pdf', 'file://*/*.pdf']
    })
  })
}

chrome.runtime.onInstalled.addListener(createMenus)
chrome.runtime.onStartup.addListener(createMenus)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = null
  let fileType = null

  if (info.menuItemId === MENU_IMAGE) {
    targetUrl = info.srcUrl
    fileType = 'image'
  } else if (info.menuItemId === MENU_LINK) {
    targetUrl = info.linkUrl
    fileType = trustaiClassify(info.linkUrl)
  } else if (info.menuItemId === MENU_PAGE_PDF) {
    targetUrl = tab?.url
    fileType = 'document'
  }

  if (!targetUrl) return
  runVerification(targetUrl, fileType)
})

async function runVerification(targetUrl, fileType) {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await chrome.storage.session.set({
    [jobId]: { status: 'loading', fileType, sourceUrl: targetUrl }
  })

  chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?job=${jobId}`) })

  try {
    const fileResponse = await fetch(targetUrl)
    if (!fileResponse.ok) {
      throw new Error(`Could not download that file (HTTP ${fileResponse.status}).`)
    }
    const blob = await fileResponse.blob()
    const filename = trustaiGuessFilename(targetUrl, blob.type, fileType)

    const apiBase = await trustaiGetApiBase()
    const formData = new FormData()
    formData.append('file', blob, filename)
    formData.append('fileType', fileType)

    const verifyResponse = await fetch(`${apiBase}/api/verify/${fileType === 'document' ? 'document' : 'image'}`, {
      method: 'POST',
      body: formData
    })

    if (!verifyResponse.ok) {
      const detail = await verifyResponse.json().catch(() => null)
      throw new Error(detail?.detail || `TrustAI server error (HTTP ${verifyResponse.status}).`)
    }

    const result = await verifyResponse.json()
    await chrome.storage.session.set({ [jobId]: { status: 'done', fileType, sourceUrl: targetUrl, result } })
  } catch (err) {
    await chrome.storage.session.set({
      [jobId]: {
        status: 'error',
        fileType,
        sourceUrl: targetUrl,
        message: err?.message || 'Something went wrong while checking this file.'
      }
    })
  }
}

// Lets popup.html hand off a locally-picked file the same way a
// right-click job works, so both paths share runVerification-style logic.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'trustai-manual-check') {
    handleManualCheck(message.fileData, message.fileName, message.mimeType, message.fileType)
      .then((jobId) => sendResponse({ jobId }))
    return true // keep the message channel open for the async response
  }
})

async function handleManualCheck(fileDataUrl, fileName, mimeType, fileType) {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await chrome.storage.session.set({ [jobId]: { status: 'loading', fileType, sourceUrl: fileName } })
  chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?job=${jobId}`) })

  try {
    const blob = await (await fetch(fileDataUrl)).blob()
    const apiBase = await trustaiGetApiBase()
    const formData = new FormData()
    formData.append('file', blob, fileName)
    formData.append('fileType', fileType)

    const verifyResponse = await fetch(`${apiBase}/api/verify/${fileType === 'document' ? 'document' : 'image'}`, {
      method: 'POST',
      body: formData
    })
    if (!verifyResponse.ok) {
      const detail = await verifyResponse.json().catch(() => null)
      throw new Error(detail?.detail || `TrustAI server error (HTTP ${verifyResponse.status}).`)
    }
    const result = await verifyResponse.json()
    await chrome.storage.session.set({ [jobId]: { status: 'done', fileType, sourceUrl: fileName, result } })
  } catch (err) {
    await chrome.storage.session.set({
      [jobId]: { status: 'error', fileType, sourceUrl: fileName, message: err?.message || 'Check failed.' }
    })
  }
  return jobId
}
