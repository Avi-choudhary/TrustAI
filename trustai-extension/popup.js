const pickFileBtn = document.getElementById('pickFileBtn')
const fileInput = document.getElementById('fileInput')
const statusEl = document.getElementById('status')

pickFileBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0]
  if (!file) return

  const fileType = trustaiClassify(file.name, file.type)
  statusEl.textContent = 'Uploading…'

  const reader = new FileReader()
  reader.onload = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'trustai-manual-check',
      fileData: reader.result,
      fileName: file.name,
      mimeType: file.type,
      fileType
    })
    if (response?.jobId) {
      window.close()
    } else {
      statusEl.textContent = 'Could not start the check.'
    }
  }
  reader.readAsDataURL(file)
})
