import { motion, useReducedMotion } from 'framer-motion'

type RingProps = {
  value: number
  goal: number
  label: string
  sub: string
  size: number
  stroke: number
  emphasized?: boolean
  color?: string
  animateKey?: number
  /**
   * Quando definido, no excesso (valor > meta) o número da porcentagem some do
   * centro do gráfico, esse texto aparece em cima dele, e a gramatura
   * excedida aparece abaixo da legenda de gramatura consumida.
   */
  excessLabel?: string
}

export function Ring({
  value,
  goal,
  label,
  sub,
  size,
  stroke,
  emphasized = false,
  color = 'var(--color-accent)',
  animateKey = 0,
  excessLabel,
}: RingProps) {
  const reduced = useReducedMotion()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const showExcessLabel = over && !!excessLabel
  const display = Math.round((value / goal) * 100)

  return (
    <motion.figure
      key={animateKey}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`m-0 flex flex-col items-center ${emphasized ? 'glow-ring' : ''}`}
      style={{ width: size }}
    >
      {showExcessLabel && (
        <p className="mb-2 max-w-[90%] text-center font-display text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-accent-soft">
          {excessLabel}
        </p>
      )}
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
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduced ? circumference : circumference }}
          animate={{ strokeDashoffset: reduced ? circumference : circumference * (1 - pct) }}
          transition={{ duration: reduced ? 0.01 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {!showExcessLabel && (
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="central"
            className="tnum font-display"
            fill="var(--color-fg)"
            fontSize={emphasized ? size * 0.24 : size * 0.2}
            fontWeight={600}
          >
            {display}%
          </text>
        )}
        {over && !excessLabel && (
          <text
            x="50%"
            y="66%"
            textAnchor="middle"
            dominantBaseline="central"
            className="tnum font-display"
            fill="var(--color-accent)"
            fontSize={size * 0.085}
            fontWeight={600}
          >
            meta batida
          </text>
        )}
      </svg>
      <figcaption className="mt-2 text-center">
        <span
          className="block font-display text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: emphasized ? 'var(--color-accent)' : 'var(--color-muted)' }}
        >
          {label}
        </span>
        <span className="tnum mt-1 block text-xs" style={{ color: 'var(--color-faint)' }}>
          {sub}
        </span>
        {showExcessLabel && (
          <span className="tnum mt-1 block text-xs font-semibold" style={{ color: 'var(--color-accent-soft)' }}>
            excedeu {Math.round(value - goal)}g
          </span>
        )}
      </figcaption>
    </motion.figure>
  )
}
