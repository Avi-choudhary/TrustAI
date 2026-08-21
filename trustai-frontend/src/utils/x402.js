/**
 * X402 Payment Protocol Client Utilities
 * 
 * Standard HTTP 402 "Payment Required" specification client implementation.
 * Supports Base, Ethereum, Polygon, Solana, and TrustAI Devnet.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const NETWORKS = [
  {
    id: 'eip155:8453',
    name: 'Base (Coinbase L2)',
    shortName: 'Base',
    chainId: 8453,
    assetSymbol: 'USDC',
    color: '#0052FF',
    badge: 'RECOMMENDED',
    icon: '🔵',
  },
  {
    id: 'eip155:1',
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    chainId: 1,
    assetSymbol: 'USDC',
    color: '#627EEA',
    icon: '⟠',
  },
  {
    id: 'eip155:137',
    name: 'Polygon PoS',
    shortName: 'Polygon',
    chainId: 137,
    assetSymbol: 'USDC',
    color: '#8247E5',
    icon: '🟣',
  },
  {
    id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana Mainnet',
    shortName: 'Solana',
    chainId: 'solana',
    assetSymbol: 'USDC',
    color: '#14F195',
    icon: '☀️',
  },
  {
    id: 'eip155:31337',
    name: 'TrustAI Devnet / Sandbox',
    shortName: 'Devnet',
    chainId: 31337,
    assetSymbol: 'USDC',
    color: '#06B6D4',
    badge: 'DEV FAUCET',
    icon: '⚡',
  },
]

/**
 * Truncates 0x or Base58 address for UI display (e.g. 0x71C8...420A)
 */
export function truncateAddress(address, start = 6, end = 4) {
  if (!address) return ''
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}…${address.slice(-end)}`
}

/**
 * Format crypto balance cleanly
 */
export function formatCrypto(amount, symbol = 'USDC') {
  const num = Number(amount) || 0
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${symbol}`
}

/**
 * Fetch Gateway Configuration
 */
export async function fetchX402Config() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/x402/config`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error('Unable to fetch x402 gateway configuration')
    return await res.json()
  } catch (err) {
    console.warn('X402 config fetch error:', err)
    return null
  }
}

/**
 * Request an HTTP 402 Payment Challenge from backend
 */
export async function requestX402Challenge({ plan = 'PREMIUM', amount, purpose = 'SUBSCRIPTION', token }) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}/api/x402/challenge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan,
      amount,
      purpose,
    }),
  })

  // Status should be 402 Payment Required
  const rawBody = await res.json().catch(() => null)
  const paymentRequiredHeader = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('Payment-Required')

  let challengeData = rawBody
  if (!challengeData && paymentRequiredHeader) {
    try {
      challengeData = JSON.parse(atob(paymentRequiredHeader))
    } catch {
      // Fallback
    }
  }

  if (!challengeData) {
    throw new Error('Failed to obtain x402 payment challenge.')
  }

  return challengeData
}

/**
 * Submit signed x402 payment payload for verification & blockchain settlement
 */
export async function settleX402Payment({
  orderId,
  payerAddress,
  network = 'eip155:8453',
  amount,
  asset = 'USDC',
  plan = 'PREMIUM',
  signature,
  txHash,
  token,
}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (signature) {
    headers['X-Payment'] = signature
  }

  const res = await fetch(`${API_BASE_URL}/api/x402/settle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId,
      payerAddress,
      network,
      amount,
      asset,
      plan,
      signature,
      txHash,
    }),
  })

  const settlement = await res.json()

  if (!res.ok) {
    throw new Error(settlement.detail || 'X402 settlement failed on backend.')
  }

  return settlement
}

/**
 * Fetch authenticated user's x402 transaction ledger
 */
export async function fetchX402History(token) {
  if (!token) return []
  try {
    const res = await fetch(`${API_BASE_URL}/api/x402/history`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('Failed to load x402 history:', err)
    return []
  }
}
