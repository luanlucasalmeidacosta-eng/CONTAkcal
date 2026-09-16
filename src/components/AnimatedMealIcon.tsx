import { motion, useReducedMotion } from 'framer-motion'

type AnimatedMealIconProps = {
  size?: number
  className?: string
}

/** Variante animada do IconMealPlate: o "fio de macarrão" (o círculo) gira sem parar, como se o garfo estivesse correndo atrás dele. */
export function AnimatedMealIcon({ size = 22, className }: AnimatedMealIconProps) {
  const reduced = useReducedMotion()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <motion.circle
        cx="16"
        cy="13"
        r="6"
        strokeDasharray="3.2 2.6"
        style={{ transformOrigin: '16px 13px' }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      <path d="M3.5 3v5a1.6 1.6 0 0 0 3.2 0V3" />
      <path d="M5.1 8v13" />
      <path d="M9.8 3c0 2.4-1.6 3.4-1.6 5.8S9.8 12 9.8 12v9" />
    </svg>
  )
}
