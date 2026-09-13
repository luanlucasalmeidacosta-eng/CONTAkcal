import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 22, ...rest }: IconProps, children: ReactNode) {
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
      {...rest}
    >
      {children}
    </svg>
  )
}

export function IconToday(props: IconProps) {
  return base(props, (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v2M21 12h-2M12 21v-2M3 12h2" />
    </>
  ))
}

export function IconWeek(props: IconProps) {
  return base(props, (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </>
  ))
}

export function IconReports(props: IconProps) {
  return base(props, (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </>
  ))
}

export function IconWater(props: IconProps) {
  return base(props, (
    <>
      <path d="M12 3.2s6.2 6.6 6.2 11a6.2 6.2 0 0 1-12.4 0c0-4.4 6.2-11 6.2-11Z" />
      <path d="M9.2 14.2a2.9 2.9 0 0 0 2.6 2.9" />
    </>
  ))
}

export function IconSettings(props: IconProps) {
  return base(props, (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h13" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="19" cy="17" r="2" />
    </>
  ))
}

export function IconGoogle(props: IconProps) {
  return base({ strokeWidth: 1.5, ...props }, (
    <>
      <path d="M20.5 12.2c0-.65-.06-1.27-.16-1.87H12v3.54h4.77a4.08 4.08 0 0 1-1.77 2.68v2.2h2.86c1.68-1.55 2.64-3.83 2.64-6.55Z" />
      <path d="M12 21c2.4 0 4.4-.79 5.86-2.15l-2.86-2.2c-.79.53-1.81.85-3 .85-2.3 0-4.26-1.56-4.96-3.64H4.09v2.28A9 9 0 0 0 12 21Z" />
      <path d="M7.04 13.86A5.4 5.4 0 0 1 6.75 12c0-.65.11-1.28.29-1.86V7.86H4.09A9 9 0 0 0 3 12c0 1.45.35 2.83.96 4.14l3.08-2.28Z" />
      <path d="M12 6.5c1.3 0 2.47.45 3.39 1.33l2.54-2.54C16.4 3.9 14.4 3 12 3a9 9 0 0 0-8 4.86l3.04 2.28C7.74 8.06 9.7 6.5 12 6.5Z" />
    </>
  ))
}

export function IconSpark(props: IconProps) {
  return base({ strokeWidth: 1.5, ...props }, (
    <>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6L4.5 10l5.6-1.9 1.9-5.6Z" />
      <path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" />
    </>
  ))
}
