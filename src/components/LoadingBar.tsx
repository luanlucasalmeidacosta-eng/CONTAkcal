import { motion, useReducedMotion } from 'framer-motion'

type LoadingBarProps = {
  value: number
  goal: number
  label: string
  sub: string
}

export function LoadingBar({ value, goal, label, sub }: LoadingBarProps) {
  const reduced = useReducedMotion()
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const display = goal > 0 ? Math.round((value / goal) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {label}
        </span>
        <span className="tnum font-display text-2xl font-semibold text-fg">{display}%</span>
      </div>

      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-track">
        <motion.div
          className="glow-ring h-full rounded-full bg-accent"
          initial={{ width: reduced ? `${pct * 100}%` : 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduced ? 0.01 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="tnum text-xs text-faint">{sub}</p>
        {over && <p className="font-display text-xs font-semibold text-accent">meta batida</p>}
      </div>
    </div>
  )
}
