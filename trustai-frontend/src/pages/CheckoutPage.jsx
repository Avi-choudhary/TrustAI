import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import PaymentFailedModal from '../components/PaymentFailedModal'
import { NETWORKS, truncateAddress, formatCrypto } from '../utils/x402'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)

    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const { user, upgradePlan } = useAuth()
  const token = user?.accessToken

  const initialMethod = params.get('method') === 'razorpay' ? 'razorpay' : 'x402'
  const [paymentMethod, setPaymentMethod] = useState(initialMethod)

  const plan = params.get('plan') || '3-Month Plan'
  const fiatAmount = '₹399'
  const cryptoAmount = 4.99

  const {
    isConnected,
    address,
    usdcBalance,
    network,
    activeNetworkObj,
    openWalletModal,
    switchNetwork,
    requestFaucet,
    executeX402Payment,
  } = useWallet()

  const [status, setStatus] = useState('idle') // 'idle' | 'challenging' | 'signing' | 'settling' | 'success'
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [showFailed, setShowFailed] = useState(false)
  const [faucetAdded, setFaucetAdded] = useState(false)

  // -------------------------------------------------------------
  // X402 Web3 Protocol Payment Flow
  // -------------------------------------------------------------
  const handleX402Pay = async () => {
    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    if (!isConnected || !address) {
      openWalletModal()
      return
    }

    if (usdcBalance < cryptoAmount) {
      setError(
        `Insufficient balance. You need ${cryptoAmount} USDC, but have ${usdcBalance.toFixed(2)} USDC in your wallet. Use the test faucet below to add funds.`
      )
      return
    }

    setStatus('processing')
    setError('')

    try {
      const settlement = await executeX402Payment({
        plan: 'PREMIUM',
        amount: cryptoAmount,
        purpose: 'SUBSCRIPTION',
        userToken: token,
        onProgress: ({ step, message }) => {
          setStatusMsg(message)
        },
      })

      // Backend confirmed and stamped to audit ledger
      upgradePlan('PREMIUM')
      setStatus('success')

      const successParams = new URLSearchParams({
        plan: plan,
        amount: `${cryptoAmount} USDC`,
        method: `x402 Protocol (${activeNetworkObj.shortName})`,
        txn: settlement.txHash || settlement.orderId,
        orderId: settlement.orderId,
        blockHash: settlement.blockchainReceipt?.block_hash || '',
        blockIndex: String(settlement.blockchainReceipt?.block_index ?? ''),
      })

      navigate(`/payment-success?${successParams.toString()}`)
    } catch (err) {
      console.error('X402 Checkout Error:', err)
      setStatus('idle')
      setError(err.message || 'X402 payment authorization failed.')
      setShowFailed(true)
    }
  }

  // -------------------------------------------------------------
  // Traditional Razorpay Payment Flow
  // -------------------------------------------------------------
  const handleRazorpayPay = async () => {
    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    setStatus('processing')
    setError('')

    try {
      const razorpayLoaded = await loadRazorpayScript()
      if (!razorpayLoaded) {
        throw new Error(
          'Unable to load Razorpay Checkout. Please check your internet connection.'
        )
      }

      const orderResponse = await fetch(
        `${API_BASE_URL}/api/subscription/create-order`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(
          orderData.detail || 'Unable to create Razorpay order.'
        )
      }

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TrustAI',
        description: 'TrustAI Premium — 3 Month Plan',
        order_id: orderData.order_id,
        prefill: { email: user?.email || '' },
        notes: {
          plan: orderData.plan || 'PREMIUM',
          duration_days: String(orderData.duration_days || 90),
        },
        theme: { color: '#171513' },
        handler: async function (response) {
          try {
            setStatus('processing')
            setError('')

            const verifyResponse = await fetch(
              `${API_BASE_URL}/api/subscription/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            )

            const verifyData = await verifyResponse.json()
            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.detail || 'Payment verification failed.'
              )
            }

            upgradePlan('PREMIUM')
            setStatus('success')

            const successParams = new URLSearchParams({
              plan: plan,
              amount: fiatAmount,
              method: 'Razorpay',
              txn: response.razorpay_payment_id,
            })

            navigate(`/payment-success?${successParams.toString()}`)
          } catch (err) {
            console.error('Payment verification error:', err)
            setStatus('idle')
            setError(err.message || 'Payment verification failed.')
            setShowFailed(true)
          }
        },
        modal: {
          ondismiss: function () {
            setStatus('idle')
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response) {
        setStatus('idle')
        setError(
          response.error?.description || 'Payment failed. Please try again.'
        )
        setShowFailed(true)
      })

      razorpay.open()
    } catch (err) {
      console.error('Checkout error:', err)
      setStatus('idle')
      setError(err.message || 'Unable to start payment.')
    }
  }

  const handleTestFaucet = () => {
    requestFaucet(25)
    setFaucetAdded(true)
    setError('')
    setTimeout(() => setFaucetAdded(false), 2000)
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <p className="tag-tab text-xs text-cyan mb-2">ACCOUNT · BILLING &amp; CHECKOUT</p>
      <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink">
        Complete your order
      </h1>
      <p className="text-sm text-inkSoft mt-1">
        Activate TrustAI Premium with machine-speed x402 Web3 protocol or standard fiat cards.
      </p>

      {/* Plan Summary */}
      <div className="mt-6 border border-graphite/25 rounded-xl bg-paperDark p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <span className="tag-tab text-[10px] text-graphite font-semibold">SELECTED PLAN</span>
            <p className="text-base text-ink font-semibold mt-1">{plan}</p>
            <p className="text-xs text-inkSoft">Unlimited forensic scans &amp; bulk intake for 90 days</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tracking-tight text-cyan">
              {paymentMethod === 'x402' ? `${cryptoAmount} USDC` : fiatAmount}
            </p>
            <span className="text-[11px] text-graphite block">for 90 days</span>
          </div>
        </div>
      </div>

      {/* Payment Method Switcher Tabs */}
      <div className="mt-6 border border-graphite/25 rounded-2xl bg-paperDark overflow-hidden shadow-soft">
        <div className="grid grid-cols-2 p-1.5 bg-paper/60 border-b hairline gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('x402')
              setError('')
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tag-tab transition-all ${
              paymentMethod === 'x402'
                ? 'bg-gradient-to-r from-violet to-cyan text-paper shadow-glow'
                : 'text-inkSoft hover:text-ink hover:bg-mist'
            }`}
          >
            <span>⚡</span>
            <span>x402 Web3 Protocol</span>
            <span className="text-[9px] bg-paper/20 px-1.5 py-0.2 rounded-full hidden sm:inline">
              USDC
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentMethod('razorpay')
              setError('')
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tag-tab transition-all ${
              paymentMethod === 'razorpay'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-inkSoft hover:text-ink hover:bg-mist'
            }`}
          >
            <span>💳</span>
            <span>Card / UPI (Razorpay)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {paymentMethod === 'x402' ? (
            /* X402 PROTOCOL VIEW */
            <div className="space-y-5">
              {/* Wallet connection banner */}
              <div className="p-4 rounded-xl bg-paper/70 border border-graphite/30">
                <div className="flex items-center justify-between">
                  <span className="tag-tab text-[10px] text-graphite font-semibold">
                    CONNECTED WEB3 WALLET
                  </span>
                  <button
                    type="button"
                    onClick={openWalletModal}
                    className="tag-tab text-[11px] text-cyan hover:underline"
                  >
                    {isConnected ? 'SWITCH WALLET' : 'CONNECT WALLET'}
                  </button>
                </div>

                {isConnected ? (
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="tag-tab text-xs font-mono text-ink">
                        {truncateAddress(address, 8, 6)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="tag-tab text-[11px] font-semibold text-cyan">
                        {formatCrypto(usdcBalance, 'USDC')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-left">
                    <p className="text-xs text-inkSoft mb-2">No wallet connected.</p>
                    <button
                      type="button"
                      onClick={openWalletModal}
                      className="tag-tab text-xs font-semibold px-4 py-2 rounded-sm bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 shadow-sm transition-opacity"
                    >
                      Connect MetaMask / Devnet Wallet →
                    </button>
                  </div>
                )}
              </div>

              {/* Network selection */}
              <div>
                <span className="tag-tab text-[10px] text-graphite block mb-2 font-semibold">
                  SETTLEMENT NETWORK
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => switchNetwork(net.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-left text-xs transition-all ${
                        network === net.id
                          ? 'border-cyan bg-cyanSoft/40 font-semibold text-ink ring-1 ring-cyan'
                          : 'border-graphite/25 hover:border-graphite/50 text-inkSoft hover:text-ink'
                      }`}
                    >
                      <span>{net.icon}</span>
                      <span className="truncate">{net.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Testnet Faucet Trigger */}
              {isConnected && usdcBalance < cryptoAmount && (
                <div className="p-3 rounded-lg bg-cyanSoft/30 border border-cyan/30 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <p className="font-semibold text-ink">Need testnet USDC?</p>
                    <p className="text-inkSoft text-[11px]">Mint test funds to test x402 checkout</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestFaucet}
                    className="tag-tab text-xs font-semibold px-3 py-1.5 rounded-sm bg-gradient-to-r from-violet to-cyan text-paper hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {faucetAdded ? '+25 Added!' : '+25 USDC Faucet'}
                  </button>
                </div>
              )}

              {/* Protocol Step breakdown */}
              <div className="p-3.5 rounded-lg bg-mist/50 border border-graphite/20 text-xs space-y-2 text-inkSoft">
                <div className="flex items-center justify-between">
                  <span>Protocol Standard</span>
                  <span className="tag-tab text-[10px] text-ink font-semibold">HTTP 402 / EIP-712</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Asset &amp; Amount</span>
                  <span className="tag-tab text-[10px] text-cyan font-semibold">{cryptoAmount} USDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Blockchain Ledger</span>
                  <span className="tag-tab text-[10px] text-ink font-semibold">Tamper-Evident Audit Stamp</span>
                </div>
              </div>

              {/* Status Message during settlement */}
              {status === 'processing' && statusMsg && (
                <div className="p-3 rounded-lg bg-cyanSoft/40 border border-cyan/40 text-xs text-cyan flex items-center gap-2 animate-pulse font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Pay Button */}
              <button
                type="button"
                onClick={handleX402Pay}
                disabled={status === 'processing'}
                className="w-full tag-tab text-xs font-semibold bg-gradient-to-r from-violet to-cyan text-paper px-5 py-3.5 rounded-xl hover:opacity-90 shadow-glow transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                {status === 'processing'
                  ? 'AUTHORIZING X402 PAYMENT…'
                  : `PAY ${cryptoAmount} USDC VIA X402 →`}
              </button>
            </div>
          ) : (
            /* RAZORPAY FIAT VIEW */
            <div className="space-y-5">
              <div className="rounded-xl border border-graphite/25 bg-paper/70 p-4">
                <p className="tag-tab text-[10px] text-graphite font-semibold">SECURE CARD / UPI GATEWAY</p>
                <p className="text-sm text-ink mt-2 leading-relaxed">
                  You will be redirected to Razorpay's secure checkout to complete payment in Indian Rupees (INR).
                </p>

                <div className="mt-4 space-y-2 text-xs text-inkSoft border-t hairline pt-3">
                  <div className="flex justify-between">
                    <span>Plan</span>
                    <span className="text-ink font-medium">Premium (90 Days)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="text-ink font-medium">{fiatAmount}</span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Pay button */}
              <button
                type="button"
                onClick={handleRazorpayPay}
                disabled={status === 'processing'}
                className="w-full tag-tab text-xs font-semibold bg-ink text-paper px-5 py-3.5 rounded-xl hover:bg-inkSoft transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>💳</span>
                {status === 'processing' ? 'PROCESSING…' : `PAY ${fiatAmount} VIA RAZORPAY →`}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-inkSoft mt-6 text-center">
        <Link to="/pricing" className="text-cyan font-medium hover:underline">
          ← Back to pricing plans
        </Link>
      </p>

      {/* Payment Failed Modal */}
      {showFailed && (
        <PaymentFailedModal
          onRetry={() => {
            setShowFailed(false)
            setError('')
          }}
          onChangeMethod={() => {
            setShowFailed(false)
            setError('')
            setPaymentMethod((m) => (m === 'x402' ? 'razorpay' : 'x402'))
          }}
          onClose={() => {
            setShowFailed(false)
            setError('')
          }}
        />
      )}
    </div>
  )
}