import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginView } from '@/features/auth/LoginView'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { MainApp } from '@/features/dashboard/MainApp'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <span className="glow-text font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        CONTAkcal
      </span>
    </div>
  )
}

function Gate() {
  const { firebaseUser, userDoc, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!firebaseUser) return <LoginView />
  if (!userDoc?.onboardingCompleted) return <OnboardingFlow />
  return <MainApp />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
