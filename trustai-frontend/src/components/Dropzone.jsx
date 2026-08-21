import { useCallback, useRef, useState } from 'react'

const ACCEPTED = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'image/jpeg', 'image/png']
}

function detectFileType(file) {
  if (file.type === 'application/pdf') return 'document'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

export default function Dropzone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0]
      if (!file) return

      const detected = detectFileType(file)
      if (!detected) {
        setError('Unsupported file type. Upload an image or PDF document.')
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File is larger than 100MB. Try a smaller file for this demo.')
        return
      }
      setError(null)
      onFileSelected(file, detected)
    },
    [onFileSelected]
  )

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={`relative cursor-pointer rounded-md border-2 border-dashed transition-all px-8 py-16 text-center
          ${isDragging ? 'border-cyan bg-cyanSoft/40 scale-[1.005] shadow-glow' : 'border-graphite/40 bg-paperDark/40 hover:border-violet/60'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="mx-auto w-14 h-14 rounded-sm bg-gradient-to-br from-violet to-cyan flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
            <path d="M12 3v12" strokeLinecap="round" />
            <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="font-display font-semibold text-lg text-ink">Drop evidence here, or click to select</p>
        <p className="text-inkSoft text-sm mt-1.5">
          Accepts images (JPG, PNG) or scanned documents (PDF) — local image-forensics checks run automatically on image uploads
        </p>

        <div className="flex items-center justify-center gap-2 mt-5">
          {['IMAGE', 'DOCUMENT'].map((tag) => (
            <span key={tag} className="tag-tab text-[10px] px-2 py-1 border border-graphite/40 rounded-sm text-graphite">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-high font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
