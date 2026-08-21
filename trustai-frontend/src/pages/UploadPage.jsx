import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dropzone from '../components/Dropzone'
import LoadingAnalyzer from '../components/LoadingAnalyzer'
import { verifyFile } from '../api/verifyApi'
import { saveToHistory } from '../utils/storage'
import { useAuth } from '../context/AuthContext'

const SIGNALS = [
  {
    tag: 'METADATA',
    desc: 'Edit history, software signatures, timestamp inconsistencies',
    dot: 'bg-violet',
    soft: 'bg-violetSoft/60',
    border: 'border-violet/30'
  },
  {
    tag: 'ELA',
    desc: 'Recompression artifacts revealing localized edits',
    dot: 'bg-cyan',
    soft: 'bg-cyanSoft/60',
    border: 'border-cyan/30'
  },
  {
    tag: 'OCR',
    desc: 'Font, spacing, and baseline inconsistencies in documents',
    dot: 'bg-medium',
    soft: 'bg-mediumSoft/60',
    border: 'border-medium/30'
  }
]

export default function UploadPage() {
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)

  const navigate = useNavigate()
  const { user } = useAuth()

  const handleFileSelected = (file, fileType) => {
    setSelected({ file, fileType })
    setStatus('idle')
  }

  const runVerification = async () => {
    if (!selected) return

    // Make sure the user is authenticated
    if (!user?.accessToken) {
      console.error('No access token found')
      setStatus('error')
      return
    }

    setStatus('analyzing')
    setProgress(0)

    try {
      const result = await verifyFile({
        file: selected.file,
        fileType: selected.fileType,
        onProgress: setProgress,
        accessToken: user.accessToken
      })

      saveToHistory(result)
      navigate(`/results/${result.id}`, {
        state: { result }
      })
    } catch (err) {
      console.error('Verification error:', err)
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto px-5 py-14">

        <div className="mb-9">
          <p className="tag-tab text-xs text-cyan mb-2">
            EVIDENCE INTAKE
          </p>

          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink">
            Submit media for{' '}
            <span className="spectrum-text">verification</span>
          </h1>

          <p className="text-inkSoft mt-3 max-w-xl leading-relaxed">
            TrustAI checks metadata, compression artifacts, and layout
            consistency to flag likely tampering, deepfakes, or AI generation
            &mdash; for photos and scanned documents like marksheets and
            certificates. Results describe likelihood of tampering, not a
            definitive verdict.
          </p>
        </div>

        {status === 'analyzing' ? (
          <LoadingAnalyzer progress={progress} />
        ) : (
          <>
            <Dropzone onFileSelected={handleFileSelected} />

            {selected && (
              <div className="mt-5 flex items-center justify-between gap-4 border border-cyan/30 rounded-sm bg-cyanSoft/40 px-4 py-3.5 animate-fadeUp">
                <div className="min-w-0">
                  <p className="tag-tab text-[10px] text-cyan">
                    {selected.fileType.toUpperCase()} SELECTED
                  </p>

                  <p className="font-medium truncate text-ink">
                    {selected.file.name}
                  </p>
                </div>

                <button
                  onClick={runVerification}
                  className="shrink-0 tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity shadow-glow"
                >
                  RUN VERIFICATION →
                </button>
              </div>
            )}

            {status === 'error' && (
              <p
                className="mt-4 text-sm text-high font-medium"
                role="alert"
              >
                Something went wrong running the check. Try again.
              </p>
            )}
          </>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SIGNALS.map((s) => (
            <div
              key={s.tag}
              className={`border ${s.border} rounded-sm px-4 py-3.5 ${s.soft}`}
            >
              <p className="tag-tab text-[10px] text-graphite mb-1.5 flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${s.dot}`}
                />
                {s.tag}
              </p>

              <p className="text-sm text-inkSoft">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}