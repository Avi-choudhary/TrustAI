import { buildMockResult } from '../utils/mockData'

const USE_MOCK = false

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function verifyFile({
  file,
  fileType,
  onProgress,
  accessToken
}) {
  if (USE_MOCK) {
    return mockVerify({ file, fileType, onProgress })
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileType', fileType)

  const headers = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers,
    body: formData
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errJson = await response.json()
      errorDetail = errJson.detail || JSON.stringify(errJson)
    } catch {
      errorDetail = await response.text()
    }
    throw new Error(
      `Verification request failed (${response.status}): ${errorDetail}`
    )
  }

  return response.json()
}

function mockVerify({ file, fileType, onProgress }) {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const previewUrl = reader.result

      const steps = [15, 40, 65, 85, 100]
      let i = 0

      const interval = setInterval(() => {
        onProgress?.(steps[i])
        i += 1

        if (i >= steps.length) {
          clearInterval(interval)

          resolve(
            buildMockResult({
              fileName: file.name,
              fileType,
              previewUrl
            })
          )
        }
      }, 260)
    }

    reader.readAsDataURL(file)
  })
}