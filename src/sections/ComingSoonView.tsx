import { motion } from 'framer-motion'

type ComingSoonViewProps = {
  title: string
  description: string
  icon: React.ReactNode
}

export function ComingSoonView({ title, description, icon }: ComingSoonViewProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="soon-title"
      className="mx-auto flex w-full max-w-xl flex-col items-center px-5 pt-24 text-center lg:max-w-2xl lg:pt-36"
    >
      <div className="glow-ring flex h-20 w-20 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
        {icon}
      </div>
      <h1 id="soon-title" className="mt-6 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted lg:text-base">{description}</p>
    </motion.section>
  )
}
