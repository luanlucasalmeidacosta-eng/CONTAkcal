import { motion, useReducedMotion } from 'framer-motion'

type DrumstickProgressProps = {
  value: number
  goal: number
  label: string
  sub: string
}

const MEAT_PATH =
  'M100,20 C140,15 165,35 165,60 C165,85 145,105 115,112 C85,119 45,115 28,95 C12,77 15,50 40,32 A28,28 0 0,0 80,22 C86,17 93,18 100,20 Z'
const CLIP_ID = 'drumstick-progress-clip'
const TOP_Y = 14
const BOTTOM_Y = 119

export function DrumstickProgress({ value, goal, label, sub }: DrumstickProgressProps) {
  const reduced = useReducedMotion()
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const display = goal > 0 ? Math.round((value / goal) * 100) : 0
  const fillTopY = BOTTOM_Y - pct * (BOTTOM_Y - TOP_Y)

  return (
    <figure className="m-0 flex flex-col items-center">
      <svg width={188} height={128} viewBox="0 0 200 128" aria-hidden="true">
        <defs>
          <clipPath id={CLIP_ID}>
            <path d={MEAT_PATH} />
          </clipPath>
          <linearGradient id="drumstick-fill-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-soft)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>

        <g stroke="var(--color-line)" strokeWidth={1.5}>
          <line x1="145" y1="48" x2="172" y2="30" stroke="var(--color-muted)" strokeWidth={15} strokeLinecap="round" />
          <circle cx="173" cy="23" r="11" fill="var(--color-muted)" />
          <circle cx="176" cy="39" r="10" fill="var(--color-muted)" />
        </g>

        <path d={MEAT_PATH} fill="var(--color-track)" />

        <g clipPath={`url(#${CLIP_ID})`}>
          <motion.g
            initial={{ y: reduced ? fillTopY : BOTTOM_Y }}
            animate={{ y: fillTopY }}
            transition={{ duration: reduced ? 0.01 : 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <rect x="0" y="0" width="180" height={150} fill="url(#drumstick-fill-gradient)" />
            {!reduced && (
              <motion.path
                d="M-40,0 Q-20,-5 0,0 T40,0 T80,0 T120,0 T160,0 T200,0 V5 H-40 Z"
                fill="var(--color-accent-soft)"
                opacity={0.5}
                animate={{ x: [-40, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.g>
        </g>

        <path d={MEAT_PATH} fill="none" stroke="var(--color-line)" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>

      <div className="mt-1 text-center">
        <p className="tnum font-display text-xl font-semibold text-fg">{display}%</p>
        {over && <p className="font-display text-[11px] font-semibold text-accent">meta batida</p>}
      </div>

      <figcaption className="mt-1 text-center">
        <span className="block font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {label}
        </span>
        <span className="tnum mt-1 block text-xs text-faint">{sub}</span>
      </figcaption>
    </figure>
  )
}
