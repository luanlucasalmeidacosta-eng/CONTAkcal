import { motion, useReducedMotion } from 'framer-motion'
import { IconMealPlate } from '@/icons'

type FastingClockProps = {
  pct: number
  remainingLabel: string
  subLabel: string
  size?: number
}

export function FastingClock({ pct, remainingLabel, subLabel, size = 240 }: FastingClockProps) {
  const reduced = useReducedMotion()
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center">
      <div
        className="glow-ring mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10"
        aria-hidden="true"
      >
        <IconMealPlate size={24} className="text-accent" />
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: reduced ? 0.01 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="central"
          className="tnum font-display"
          fill="var(--color-fg)"
          fontSize={size * 0.13}
          fontWeight={600}
        >
          {remainingLabel}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-display"
          fill="var(--color-faint)"
          fontSize={size * 0.045}
          fontWeight={600}
          style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}
        >
          {subLabel}
        </text>
      </svg>
    </div>
  )
}
