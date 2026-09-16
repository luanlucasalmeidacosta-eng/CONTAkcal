import { motion } from 'framer-motion'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginView } from '@/features/auth/LoginView'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { MainApp } from '@/features/dashboard/MainApp'
import { IconMealPlate } from '@/icons'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <motion.div
        className="glow-ring flex h-16 w-16 items-center justify-center rounded-3xl border border-accent/40 bg-accent/10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <IconMealPlate size={30} className="text-accent" />
      </motion.div>
      <div className="flex flex-col items-center gap-1">
        <span className="glow-text font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          CONTAkcal
        </span>
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
          by @vixeluan
        </span>
      </div>
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
