function pdfSafe(value) {
  return String(value ?? '')
    .replace(/[\\()]/g, '\\$&')
    .replace(/[^\x20-\x7e]/g, '?')
}

function wrap(text, width = 88) {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    if (!line) {
      line = word
    } else if (`${line} ${word}`.length <= width) {
      line += ` ${word}`
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function reportLines(result) {
  const lines = [
    'TRUSTAI VERIFICATION REPORT',
    `Case ID: ${result.id}`,
    `File: ${result.fileName}`,
    `Type: ${result.fileType}`,
    `Submitted: ${new Date(result.submittedAt).toLocaleString()}`,
    '',
    'RISK ASSESSMENT',
    `Score: ${result.riskScore}/100`,
    `Bucket: ${result.riskBucket}`,
    `Verdict: ${result.verdict || 'Not supplied'}`,
    '',
    'DETECTION SIGNALS',
  ]

  for (const signal of result.signals || []) {
    lines.push(...wrap(`${signal.label} (${signal.status}): ${signal.summary}`))
    for (const detail of signal.details || []) lines.push(...wrap(`  - ${detail}`))
    for (const zone of signal.hotzones || []) {
      lines.push(`  - Region: x=${zone.x}, y=${zone.y}, width=${zone.width}, height=${zone.height}, confidence=${zone.confidence}`)
    }
  }

  if (result.graphCorroborationBonus !== undefined && result.graphCorroborationBonus !== null) {
    lines.push('', 'CORROBORATION', `Graph corroboration bonus: ${result.graphCorroborationBonus} points`)
  }

  if (result.documentHash || result.blockchainReceipt) {
    lines.push('', 'AUDIT LEDGER RECEIPT')
    if (result.documentHash) lines.push(...wrap(`File SHA-256: ${result.documentHash}`))
    if (result.blockchainReceipt) {
      const receipt = result.blockchainReceipt
      lines.push(`Ledger type: ${receipt.ledger_type || 'local tamper-evident ledger'}`)
      lines.push(`Block index: ${receipt.block_index}`)
      lines.push(...wrap(`Block hash: ${receipt.block_hash}`))
      lines.push(...wrap(`Previous hash: ${receipt.previous_hash}`))
      lines.push(`Recorded: ${new Date(Number(receipt.timestamp) * 1000).toLocaleString()}`)
      lines.push(`Proof-of-work nonce: ${receipt.nonce}`)
    }
  }

  lines.push('', 'DISCLAIMER', ...wrap('This report is automated decision-support evidence. It is not a definitive fraud accusation or legal determination.'))
  return lines
}

function buildPdf(lines) {
  const linesPerPage = 48
  const pages = []
  for (let index = 0; index < lines.length; index += linesPerPage) pages.push(lines.slice(index, index + linesPerPage))

  const pageIds = pages.map((_, index) => 4 + index * 2)
  const objects = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pages.forEach((page, index) => {
    const pageId = pageIds[index]
    const contentId = pageId + 1
    const body = ['BT', '/F1 10 Tf', '50 760 Td', '14 TL', ...page.map((line) => `(${pdfSafe(line)}) Tj T*`), 'ET'].join('\n')
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${body.length} >>\nstream\n${body}\nendstream`
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return pdf
}

export function downloadVerificationReport(result) {
  const pdf = buildPdf(reportLines(result))
  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trustai-verification-${result.id}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
