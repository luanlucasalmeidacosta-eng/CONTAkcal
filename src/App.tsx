import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginView } from '@/features/auth/LoginView'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { MainApp } from '@/features/dashboard/MainApp'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-1 bg-bg">
      <span className="glow-text font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        CONTAkcal
      </span>
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
        by @vixeluan
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
