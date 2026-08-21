// File types the browser can actually render inside an <img> tag.
// Anything else (pdf, docx, etc.) falls back to the file-card view below.
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']

function getExtension(fileName = '') {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function FileCard({ fileName, extension }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-sm border border-graphite/25 bg-paperDark">
      <div className="w-14 h-16 rounded-sm bg-ink/10 border border-graphite/40 flex items-center justify-center relative">
        <span className="tag-tab text-[9px] font-bold text-cyan absolute bottom-1.5 px-1">
          {extension ? `.${extension}` : 'FILE'}
        </span>
      </div>
      <p className="text-sm text-ink font-medium text-center break-all max-w-xs">
        {fileName || 'Uploaded file'}
      </p>
      <p className="tag-tab text-[10px] text-graphite">
        {extension ? extension.toUpperCase() : 'UNKNOWN'} · Preview not available for this file type
      </p>
    </div>
  )
}

export default function ImageHotzoneOverlay({ previewUrl, hotzones = [], fileType, fileName = '' }) {
  const extension = getExtension(fileName)
  const canRenderAsImage = IMAGE_EXTENSIONS.includes(extension)

  // Previews aren't persisted in history (see storage.js) to avoid
  // blowing the localStorage quota, so older cases reopened from the
  // History page won't have a previewUrl. Fall back to the file card.
  if (!previewUrl) {
    return <FileCard fileName={fileName} extension={extension} />
  }

  if (!canRenderAsImage) {
    return <FileCard fileName={fileName} extension={extension} />
  }

  return (
    <div className="relative rounded-sm overflow-hidden border border-graphite/25 bg-[repeating-conic-gradient(#1C1816_0%_25%,#141010_0%_50%)] bg-[length:16px_16px]">
      <img src={previewUrl} alt={fileName || 'Uploaded file'} className="w-full max-h-[420px] object-contain mx-auto block" />

      {hotzones.map((zone, i) => (
        <div
          key={i}
          className="absolute border-2 border-high"
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`,
            boxShadow: '0 0 18px 0 rgba(251,77,108,0.5)'
          }}
        >
          <span className="absolute -top-[1.6rem] left-0 tag-tab text-[10px] bg-high text-paper px-1.5 py-0.5 rounded-sm whitespace-nowrap font-semibold">
            {zone.note || `Hot zone ${i + 1}`} · {Math.round(zone.confidence * 100)}%
          </span>
          <span className="absolute inset-0 border border-high/40 animate-pulse" />
        </div>
      ))}

      {hotzones.length > 0 && (
        <div className="absolute bottom-2 right-2 tag-tab text-[9px] bg-paper/90 text-ink px-2 py-1 rounded-sm border border-graphite/30">
          ELA HOT ZONES HIGHLIGHTED
        </div>
      )}
    </div>
  )
}
