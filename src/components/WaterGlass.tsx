import { motion, useReducedMotion } from 'framer-motion'

type WaterGlassProps = {
  value: number
  goal: number
  label: string
  sub: string
}

const GLASS_TOP_Y = 14
const GLASS_BOTTOM_Y = 176
const CLIP_ID = 'water-glass-clip'

export function WaterGlass({ value, goal, label, sub }: WaterGlassProps) {
  const reduced = useReducedMotion()
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const display = goal > 0 ? Math.round((value / goal) * 100) : 0

  const liquidTopY = GLASS_BOTTOM_Y - pct * (GLASS_BOTTOM_Y - GLASS_TOP_Y)

  return (
    <figure className="m-0 flex flex-col items-center">
      <svg width={148} height={196} viewBox="0 0 148 196" aria-hidden="true">
        <defs>
          <clipPath id={CLIP_ID}>
            <path d="M20,14 L128,14 L112,176 Q110,186 100,186 L48,186 Q38,186 36,176 Z" />
          </clipPath>
          <linearGradient id="water-liquid-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-soft)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${CLIP_ID})`}>
          <rect x="0" y="0" width="148" height="196" fill="var(--color-track)" />
          <motion.g
            initial={{ y: reduced ? liquidTopY : GLASS_BOTTOM_Y }}
            animate={{ y: liquidTopY }}
            transition={{ duration: reduced ? 0.01 : 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <rect x="0" y="0" width="148" height={220} fill="url(#water-liquid-gradient)" />
            {!reduced && (
              <motion.path
                d="M-40,0 Q-20,-6 0,0 T40,0 T80,0 T120,0 T160,0 T200,0 V6 H-40 Z"
                fill="var(--color-accent-soft)"
                opacity={0.55}
                animate={{ x: [-40, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.g>
        </g>

        <path
          d="M20,14 L128,14 L112,176 Q110,186 100,186 L48,186 Q38,186 36,176 Z"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={3}
        />
        <ellipse cx="74" cy="14" rx="54" ry="5" fill="none" stroke="var(--color-line)" strokeWidth={2.5} />

        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="central"
          className="tnum font-display"
          fill="var(--color-fg)"
          fontSize={30}
          fontWeight={600}
        >
          {display}%
        </text>
        {over && (
          <text
            x="50%"
            y="60%"
            textAnchor="middle"
            dominantBaseline="central"
            className="tnum font-display"
            fill="var(--color-bg)"
            fontSize={12}
            fontWeight={700}
          >
            meta batida
          </text>
        )}
      </svg>

      <figcaption className="mt-2 text-center">
        <span className="block font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {label}
        </span>
        <span className="tnum mt-1 block text-xs text-faint">{sub}</span>
      </figcaption>
    </figure>
  )
}
