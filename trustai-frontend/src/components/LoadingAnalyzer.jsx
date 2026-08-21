const STEPS = [
  { at: 0, label: 'Reading file structure' },
  { at: 20, label: 'Checking metadata / EXIF' },
  { at: 45, label: 'Running Error Level Analysis' },
  { at: 70, label: 'Checking OCR & layout consistency' },
  { at: 95, label: 'Compiling report' }
]

export default function LoadingAnalyzer({ progress }) {
  const currentStep = [...STEPS].reverse().find((s) => progress >= s.at) ?? STEPS[0]

  return (
    <div className="border border-graphite/25 rounded-sm bg-paperDark/50 p-8 text-center overflow-hidden relative">
      <div className="relative w-24 h-24 mx-auto mb-6 border-2 border-cyan/50 rounded-sm overflow-hidden">
        <div className="absolute inset-0 bg-paper" />
        <div className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-cyan/25 to-transparent animate-scanline" />
        <div className="absolute inset-3 border border-dashed border-graphite/40" />
      </div>

      <p className="tag-tab text-xs text-cyan mb-1">ANALYZING EVIDENCE</p>
      <p className="font-medium text-ink">{currentStep.label}…</p>

      <div className="w-full max-w-xs mx-auto h-1.5 bg-graphite/20 rounded-full mt-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet via-cyan to-medium transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="tag-tab text-[10px] text-graphite mt-2">{progress}%</p>
    </div>
  )
}
