import { motion } from 'framer-motion'

type PhaseChipProps = {
  phase: string
}

export function PhaseChip({ phase }: PhaseChipProps) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-accent"
    >
      <span className="glow-text inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      {phase}
    </motion.span>
  )
}
