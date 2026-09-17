import { motion, useReducedMotion } from 'framer-motion'

type FlameProgressProps = {
  value: number
  goal: number
  label: string
  sub: string
}

// Uma única gota de chama, limpa: ponta no topo + base arredondada (arco de
// círculo), sem costuras nem interseções — igual ao contorno do copo d'água.
const FLAME_PATH = 'M60,6 Q96,60 94,108 A40,40 0 1 1 14,108 Q12,60 60,6 Z'
const CLIP_ID = 'flame-progress-clip'
const TOP_Y = 6
const BOTTOM_Y = 148

export function FlameProgress({ value, goal, label, sub }: FlameProgressProps) {
  const reduced = useReducedMotion()
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const display = goal > 0 ? Math.round((value / goal) * 100) : 0
  const fillTopY = BOTTOM_Y - pct * (BOTTOM_Y - TOP_Y)

  return (
    <figure className="m-0 flex flex-col items-center">
      <motion.svg
        width={112}
        height={150}
        viewBox="0 0 108 154"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '54px 148px' }}
      >
        <defs>
          <clipPath id={CLIP_ID}>
            <path d={FLAME_PATH} />
          </clipPath>
          <linearGradient id="flame-fill-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-soft)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>

        <path d={FLAME_PATH} fill="var(--color-track)" />

        <g clipPath={`url(#${CLIP_ID})`}>
          <motion.g
            initial={{ y: reduced ? fillTopY : BOTTOM_Y }}
            animate={{ y: fillTopY }}
            transition={{ duration: reduced ? 0.01 : 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <rect x="0" y="0" width="108" height={180} fill="url(#flame-fill-gradient)" />
            {!reduced && (
              <motion.path
                d="M-40,0 Q-20,-5 0,0 T40,0 T80,0 T120,0 T160,0 T200,0 V5 H-40 Z"
                fill="var(--color-accent-soft)"
                opacity={0.5}
                animate={{ x: [-40, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.g>
        </g>

        <path d={FLAME_PATH} fill="none" stroke="var(--color-line)" strokeWidth={2.5} strokeLinejoin="round" />
      </motion.svg>

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
