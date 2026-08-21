const apiBaseInput = document.getElementById('apiBase')
const saveBtn = document.getElementById('saveBtn')
const saved = document.getElementById('saved')

async function load() {
  const apiBase = await trustaiGetApiBase()
  apiBaseInput.value = apiBase
}

saveBtn.addEventListener('click', async () => {
  const value = apiBaseInput.value.trim() || TRUSTAI_DEFAULT_API_BASE
  await chrome.storage.sync.set({ apiBase: value })
  saved.style.display = 'inline'
  setTimeout(() => (saved.style.display = 'none'), 1500)
})

load()
