import { useState } from 'react'

function formatTimestamp(value) {
  if (!value) return 'Unavailable'
  return new Date(Number(value) * 1000).toLocaleString()
}

export default function BlockchainReceipt({ documentHash, receipt, verdict }) {
  const [copied, setCopied] = useState(false)
  const [verificationState, setVerificationState] = useState('idle')

  async function verifyReceipt() {
    setVerificationState('checking')
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    try {
      const response = await fetch(`${apiBase}/blockchain/verify/${documentHash}`)
      if (!response.ok) throw new Error('Receipt not found')
      const payload = await response.json()
      setVerificationState(payload.verification?.is_chain_valid ? 'valid' : 'invalid')
    } catch {
      setVerificationState('unavailable')
    }
  }

  if (!documentHash || !receipt) return null

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(documentHash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="border hairline rounded-sm bg-paperDark p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tag-tab text-[10px] text-cyan">AUDIT LEDGER RECEIPT</p>
          <h2 className="font-display text-base font-semibold text-ink mt-1">Verification recorded</h2>
        </div>
        <span className="tag-tab text-[10px] border border-cyan/40 text-cyan px-2 py-1 rounded-sm">BLOCK #{receipt.block_index}</span>
      </div>

      <dl className="mt-4 space-y-3 text-xs">
        <div>
          <dt className="tag-tab text-[10px] text-graphite">FILE SHA-256</dt>
          <dd className="mt-1 flex gap-2 items-start">
            <code className="min-w-0 flex-1 break-all text-inkSoft">{documentHash}</code>
            <button onClick={copyHash} className="tag-tab shrink-0 text-[10px] text-cyan hover:text-seal">{copied ? 'COPIED' : 'COPY'}</button>
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><dt className="tag-tab text-[10px] text-graphite">VERDICT</dt><dd className="mt-1 font-medium text-ink">{verdict || 'RECORDED'}</dd></div>
          <div><dt className="tag-tab text-[10px] text-graphite">RECORDED</dt><dd className="mt-1 text-inkSoft">{formatTimestamp(receipt.timestamp)}</dd></div>
        </div>
        <div><dt className="tag-tab text-[10px] text-graphite">BLOCK HASH</dt><dd className="mt-1 break-all text-inkSoft">{receipt.block_hash}</dd></div>
      </dl>
      <div className="mt-4 pt-3 border-t hairline flex items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-graphite">Local tamper-evident audit ledger; not a public-chain transaction.</p>
        <button onClick={verifyReceipt} disabled={verificationState === 'checking'} className="tag-tab shrink-0 text-[10px] text-cyan hover:text-seal disabled:text-graphite">
          {verificationState === 'checking' ? 'CHECKING…' : verificationState === 'valid' ? 'CHAIN VALID' : verificationState === 'invalid' ? 'CHAIN INVALID' : verificationState === 'unavailable' ? 'UNAVAILABLE' : 'VERIFY'}
        </button>
      </div>
    </section>
  )
}
