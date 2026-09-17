import { motion, useReducedMotion } from 'framer-motion'

type FastingClockProps = {
  pct: number
  remainingLabel: string
  subLabel: string
  size?: number
}

/** Reloginho decorativo cujos ponteiros são um garfo (minutos) e uma faca (horas). */
function ForkKnifeClockBadge() {
  return (
    <svg width={34} height={34} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-accent)" strokeWidth={2} />
      <line x1="20" y1="6.5" x2="20" y2="9.5" stroke="var(--color-line)" strokeWidth={2} strokeLinecap="round" />
      <line x1="33.5" y1="20" x2="30.5" y2="20" stroke="var(--color-line)" strokeWidth={2} strokeLinecap="round" />
      <line x1="20" y1="33.5" x2="20" y2="30.5" stroke="var(--color-line)" strokeWidth={2} strokeLinecap="round" />
      <line x1="6.5" y1="20" x2="9.5" y2="20" stroke="var(--color-line)" strokeWidth={2} strokeLinecap="round" />

      {/* faca — ponteiro das horas */}
      <line x1="20" y1="20" x2="12.2" y2="15.5" stroke="var(--color-accent)" strokeWidth={2.4} strokeLinecap="round" />

      {/* garfo — ponteiro dos minutos */}
      <line x1="20" y1="20" x2="26.9" y2="16" stroke="var(--color-accent)" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="26.9" y1="16" x2="31.1" y2="11.7" stroke="var(--color-accent)" strokeWidth={1.4} strokeLinecap="round" />
      <line x1="26.9" y1="16" x2="32.1" y2="13" stroke="var(--color-accent)" strokeWidth={1.4} strokeLinecap="round" />
      <line x1="26.9" y1="16" x2="32.7" y2="14.55" stroke="var(--color-accent)" strokeWidth={1.4} strokeLinecap="round" />

      <circle cx="20" cy="20" r="1.8" fill="var(--color-accent)" />
    </svg>
  )
}

export function FastingClock({ pct, remainingLabel, subLabel, size = 240 }: FastingClockProps) {
  const reduced = useReducedMotion()
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center">
      <div
        className="glow-ring mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10"
        aria-hidden="true"
      >
        <ForkKnifeClockBadge />
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
