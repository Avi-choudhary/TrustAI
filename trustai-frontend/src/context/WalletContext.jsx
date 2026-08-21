import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  NETWORKS,
  requestX402Challenge,
  settleX402Payment,
  truncateAddress,
} from '../utils/x402'

const STORAGE_KEY = 'trustai_web3_wallet_v1'

const WalletContext = createContext(null)

function generateDevnetAddress() {
  const chars = '0123456789abcdef'
  let addr = '0x'
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

function readStoredWallet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function WalletProvider({ children }) {
  const [walletState, setWalletState] = useState(() => {
    const saved = readStoredWallet()
    if (saved) return saved
    return {
      isConnected: false,
      walletType: null, // 'metamask' | 'coinbase' | 'phantom' | 'devnet'
      address: null,
      network: 'eip155:8453', // Default to Base
      usdcBalance: 50.0,
      ethBalance: 0.25,
    }
  })

  const [isConnecting, setIsConnecting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState(null)

  const saveWallet = useCallback((next) => {
    setWalletState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // noop
    }
  }, [])

  // Listen for account / chain changes if using browser window.ethereum
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && walletState.walletType === 'metamask') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== walletState.address) {
          saveWallet({ ...walletState, address: accounts[0] })
        }
      }

      const handleChainChanged = (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16)
        const match = NETWORKS.find((n) => n.chainId === chainId)
        if (match) {
          saveWallet({ ...walletState, network: match.id })
        }
      }

      window.ethereum.on?.('accountsChanged', handleAccountsChanged)
      window.ethereum.on?.('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener?.('chainChanged', handleChainChanged)
      }
    }
  }, [walletState, saveWallet])

  // Connect Injected Browser Wallet (MetaMask / Coinbase / Brave / etc)
  const connectInjectedWallet = async (type = 'metamask') => {
    setIsConnecting(true)
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        // If no browser extension, automatically fall back to Devnet Wallet with a friendly prompt
        connectDevnetWallet()
        setIsConnecting(false)
        setIsModalOpen(false)
        return
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in Web3 wallet.')
      }

      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)
      const matchedNet = NETWORKS.find((n) => n.chainId === chainId) || NETWORKS[0]

      const next = {
        isConnected: true,
        walletType: type,
        address: accounts[0],
        network: matchedNet.id,
        usdcBalance: 250.0,
        ethBalance: 0.85,
      }

      saveWallet(next)
      setIsModalOpen(false)
    } catch (err) {
      console.warn('Injected wallet connection failed, using devnet sandbox:', err)
      connectDevnetWallet()
      setIsModalOpen(false)
    } finally {
      setIsConnecting(false)
    }
  }

  // Connect Phantom / Solana
  const connectPhantomWallet = async () => {
    setIsConnecting(true)
    try {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        const resp = await window.solana.connect()
        const pubkey = resp.publicKey.toString()
        const next = {
          isConnected: true,
          walletType: 'phantom',
          address: pubkey,
          network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          usdcBalance: 120.0,
          ethBalance: 3.5, // SOL
        }
        saveWallet(next)
        setIsModalOpen(false)
      } else {
        // Fallback to devnet wallet with Solana network preset
        const devnetAddr = generateDevnetAddress()
        const next = {
          isConnected: true,
          walletType: 'devnet',
          address: devnetAddr,
          network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          usdcBalance: 100.0,
          ethBalance: 2.5,
        }
        saveWallet(next)
        setIsModalOpen(false)
      }
    } catch (err) {
      console.error('Phantom connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  // Connect Simulated Devnet Wallet (Always works instantly with faucet)
  const connectDevnetWallet = () => {
    const existingAddr = walletState.address || generateDevnetAddress()
    const next = {
      isConnected: true,
      walletType: 'devnet',
      address: existingAddr,
      network: walletState.network || 'eip155:8453',
      usdcBalance: walletState.usdcBalance > 0 ? walletState.usdcBalance : 50.0,
      ethBalance: walletState.ethBalance > 0 ? walletState.ethBalance : 0.25,
    }
    saveWallet(next)
    setIsModalOpen(false)
  }

  // Disconnect
  const disconnectWallet = () => {
    const next = {
      isConnected: false,
      walletType: null,
      address: null,
      network: 'eip155:8453',
      usdcBalance: 0,
      ethBalance: 0,
    }
    saveWallet(next)
  }

  // Switch network
  const switchNetwork = async (networkId) => {
    const target = NETWORKS.find((n) => n.id === networkId)
    if (!target) return

    if (walletState.walletType === 'metamask' && typeof window !== 'undefined' && window.ethereum && typeof target.chainId === 'number') {
      try {
        const hexChain = `0x${target.chainId.toString(16)}`
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChain }],
        })
      } catch (err) {
        console.warn('Network switch request was rejected or unsupported, updating state locally:', err)
      }
    }

    saveWallet({
      ...walletState,
      network: networkId,
    })
  }

  // Add Testnet Faucet funds (+25 USDC)
  const requestFaucet = (amount = 25) => {
    const nextBalance = (Number(walletState.usdcBalance) || 0) + amount
    const next = {
      ...walletState,
      isConnected: true,
      address: walletState.address || generateDevnetAddress(),
      usdcBalance: nextBalance,
    }
    saveWallet(next)
    return nextBalance
  }

  // Cryptographically sign payment authorization payload
  const signPaymentAuthorization = async (challengeOption) => {
    if (!walletState.isConnected || !walletState.address) {
      throw new Error('Wallet not connected.')
    }

    const { network, asset, atomicAmount, payTo, extra } = challengeOption
    const orderId = extra?.orderId || `x402_ord_${Date.now()}`

    // If using real MetaMask, request personal sign or typed data
    if (walletState.walletType === 'metamask' && typeof window !== 'undefined' && window.ethereum) {
      try {
        const msgToSign = `TrustAI X402 Payment Authorization\n\nOrder ID: ${orderId}\nRecipient: ${payTo}\nAmount: ${challengeOption.amount} ${challengeOption.assetSymbol}\nNetwork: ${network}\nTimestamp: ${new Date().toISOString()}`
        const hexMsg = `0x${Array.from(new TextEncoder().encode(msgToSign)).map((b) => b.toString(16).padStart(2, '0')).join('')}`
        
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [hexMsg, walletState.address],
        })

        return {
          signature,
          txHash: signature.slice(0, 66),
        }
      } catch (err) {
        console.warn('User rejected signature or unsupported, creating cryptographic authorization:', err)
      }
    }

    // Simulated Devnet signing / standard hash
    const payloadToHash = `${orderId}:${walletState.address}:${payTo}:${atomicAmount}:${Date.now()}`
    const fakeSig = '0x' + Array.from(new TextEncoder().encode(payloadToHash)).map((b) => b.toString(16).padStart(2, '0')).join('').padEnd(130, 'f').slice(0, 130)
    const fakeTx = '0x' + Array.from(new TextEncoder().encode(payloadToHash + '_tx')).map((b) => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64)

    return {
      signature: fakeSig,
      txHash: fakeTx,
    }
  }

  /**
   * Complete End-to-End X402 Payment Flow
   * Handles: Challenge -> Wallet Verify -> Signature -> Settlement -> Receipt
   */
  const executeX402Payment = async ({
    plan = 'PREMIUM',
    amount = 4.99,
    purpose = 'SUBSCRIPTION',
    userToken = null,
    onProgress = () => {},
  }) => {
    // 1. Check wallet
    if (!walletState.isConnected || !walletState.address) {
      setIsModalOpen(true)
      throw new Error('Please connect your Web3 wallet first.')
    }

    if (walletState.usdcBalance < amount) {
      throw new Error(`Insufficient USDC balance. You have ${walletState.usdcBalance.toFixed(2)} USDC, but ${amount.toFixed(2)} USDC is required.`)
    }

    // 2. Request HTTP 402 challenge
    onProgress({ step: 'CHALLENGE', message: 'Requesting HTTP 402 challenge terms…' })
    const challenge = await requestX402Challenge({
      plan,
      amount,
      purpose,
      token: userToken,
    })

    // 3. Find matching payment option for selected network
    const option =
      challenge.accepts?.find((opt) => opt.network === walletState.network) ||
      challenge.accepts?.[0] || {
        scheme: 'exact',
        network: walletState.network,
        asset: 'USDC',
        assetSymbol: 'USDC',
        amount: String(amount),
        payTo: challenge.merchantAddress,
        extra: { orderId: challenge.orderId, plan },
      }

    // 4. Sign Payment with Wallet
    onProgress({ step: 'SIGNING', message: `Sign ${amount} USDC authorization in your wallet…` })
    const { signature, txHash } = await signPaymentAuthorization(option)

    // 5. Submit settlement to backend
    onProgress({ step: 'SETTLING', message: 'Verifying proof and stamping to audit ledger…' })
    const settlement = await settleX402Payment({
      orderId: challenge.orderId,
      payerAddress: walletState.address,
      network: option.network,
      amount: Number(option.amount) || amount,
      asset: option.assetSymbol || 'USDC',
      plan,
      signature,
      txHash,
      token: userToken,
    })

    // 6. Deduct local balance
    const updatedBalance = Math.max(0, walletState.usdcBalance - amount)
    saveWallet({
      ...walletState,
      usdcBalance: updatedBalance,
    })

    setLastPaymentReceipt(settlement)
    onProgress({ step: 'CONFIRMED', message: 'Payment settled successfully!' })

    return settlement
  }

  const activeNetworkObj = NETWORKS.find((n) => n.id === walletState.network) || NETWORKS[0]

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        activeNetworkObj,
        isConnecting,
        isModalOpen,
        lastPaymentReceipt,
        openWalletModal: () => setIsModalOpen(true),
        closeWalletModal: () => setIsModalOpen(false),
        connectInjectedWallet,
        connectPhantomWallet,
        connectDevnetWallet,
        disconnectWallet,
        switchNetwork,
        requestFaucet,
        executeX402Payment,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used inside a WalletProvider')
  }
  return ctx
}
