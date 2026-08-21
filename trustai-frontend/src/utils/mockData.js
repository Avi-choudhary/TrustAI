// Mock evidence used by verifyApi.js until the real backend endpoint exists.
// Shape here IS the contract — see api/verifyApi.js for the full spec.

export function buildMockResult({ fileName, fileType, previewUrl }) {
  const isDocument = fileType === 'document'

  const riskScore = isDocument ? 68 : 34
  const riskBucket = riskScore >= 70 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW'

  const signals = isDocument
    ? [
        {
          type: 'metadata',
          label: 'Metadata / EXIF',
          status: 'info',
          summary: 'No camera metadata present — expected for a scanned document.',
          details: [
            'File saved with Adobe Photoshop 25.3',
            'No original capture timestamp found',
            'Last-modified date is 14 months after the stated issue date'
          ]
        },
        {
          type: 'ela',
          label: 'Error Level Analysis',
          status: 'flag',
          summary: 'Two regions show recompression levels inconsistent with the rest of the page.',
          hotzones: [
            { x: 58, y: 22, width: 28, height: 10, confidence: 0.82, note: 'Grade field' },
            { x: 12, y: 68, width: 22, height: 8, confidence: 0.61, note: 'Signature block' }
          ]
        },
        {
          type: 'ocr',
          label: 'OCR & Layout Consistency',
          status: 'flag',
          summary: 'Font and baseline inconsistencies detected around the flagged grade field.',
          details: [
            'Grade field uses a different font weight than surrounding text',
            'Baseline of "Marks Obtained" row is offset by 3.2px from the table grid',
            'Letter spacing in roll number is 1.4x wider than the document average'
          ]
        }
      ]
    : [
        {
          type: 'metadata',
          label: 'Metadata / EXIF',
          status: 'clear',
          summary: 'Capture metadata is consistent with an unedited camera photo.',
          details: [
            'Original EXIF timestamp present and consistent with file system dates',
            'No image-editing software signature found',
            'Camera model and lens data present'
          ]
        },
        {
          type: 'ela',
          label: 'Error Level Analysis',
          status: 'clear',
          summary: 'Compression levels are uniform across the image — no localized edits detected.',
          hotzones: []
        },
        {
          type: 'ocr',
          label: 'OCR & Layout Consistency',
          status: 'info',
          summary: 'No text regions detected — not applicable to this file.',
          details: []
        }
      ]

  return {
    id: `TRA-${Date.now().toString(36).toUpperCase()}`,
    fileName,
    fileType,
    submittedAt: new Date().toISOString(),
    riskScore,
    riskBucket,
    signals,
    previewUrl
  }
}
