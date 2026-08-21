// Simple localStorage-backed wallet — same pattern as history.js /
// blockchain.js. Swap for real backend + payment-gateway calls once a
// wallet API exists; keep these function signatures so WalletPage.jsx
// doesn't need to change.

const KEY = 'trustai_wallet_v1'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { balance: 0, transactions: [] }
  } catch {
    return { balance: 0, transactions: [] }
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Wallet storage quota exceeded, trimming older transactions', err)
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, transactions: state.transactions.slice(0, 20) }))
    } catch {
      console.warn('Still over quota after trimming — skipping wallet save for this update')
    }
  }
}

export function getBalance() {
  return read().balance
}

export function getTransactions() {
  return read().transactions
}

function transactionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = 'WTX'
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// Credits the wallet — e.g. after a successful "add money" mock payment.
export function addMoney(amount, method = 'Card') {
  const state = read()
  const balance = state.balance + amount
  const tx = {
    id: transactionId(),
    type: 'credit',
    amount,
    method,
    balanceAfter: balance,
    timestamp: new Date().toISOString()
  }
  const updated = { balance, transactions: [tx, ...state.transactions].slice(0, 50) }
  write(updated)
  return tx
}

// Debits the wallet — e.g. paying for a plan straight from the balance.
// Returns null (and makes no change) if the balance is insufficient.
export function debitMoney(amount, reason = 'Payment') {
  const state = read()
  if (amount > state.balance) return null
  const balance = state.balance - amount
  const tx = {
    id: transactionId(),
    type: 'debit',
    amount,
    method: reason,
    balanceAfter: balance,
    timestamp: new Date().toISOString()
  }
  const updated = { balance, transactions: [tx, ...state.transactions].slice(0, 50) }
  write(updated)
  return tx
}
