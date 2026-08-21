import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import PricingPage from './pages/PricingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import HistoryPage from './pages/HistoryPage'
import SavedReportsPage from './pages/SavedReportsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import WalletPage from './pages/WalletPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AuthGateModal from './components/AuthGateModal'
import { useAuth } from './context/AuthContext'

// Verification tools require an account. Signed-out visitors get sent
// straight to the sign-in/sign-up popup — the protected page itself is
// never mounted, so there's no way for it to flash through or be reached
// before auth resolves.
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) return children

  return (
    <div className="relative min-h-[60vh]">
      <AuthGateModal onClose={() => navigate('/')} />
    </div>
  )
}

function AppChrome({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="spectrum-bar" />
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t hairline py-5">
        <div className="max-w-5xl mx-auto px-5 tag-tab text-[10px] text-graphite flex justify-between">
          <span>TrustAI — Brainwave 2026, PS1</span>
          <span>NOT A DEFINITIVE FRAUD VERDICT</span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isLanding = location.pathname === '/' || location.pathname === '/pricing'

  if (isLanding) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    )
  }

  return (
    <AppChrome>
      <Routes>
        <Route
          path="/check"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved-reports"
          element={
            <ProtectedRoute>
              <SavedReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </AppChrome>
  )
}


