/** The ITCITADEL mark: a metal citadel wall with an orange gate, on a black tile. Temporary until the official logo arrives. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="itc-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8e8e93" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#111113" stroke="rgb(255 255 255 / 0.22)" />
      <path d="M10 30V13.5h3.6v3.2h3.3v-3.2h6.2v3.2h3.3v-3.2H30V30z" fill="url(#itc-metal)" />
      <path d="M17.2 30v-4.6a2.8 2.8 0 0 1 5.6 0V30z" fill="#ff6a00" />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} dir="ltr">
      <LogoMark />
      <span className="latin text-[1.05rem] font-light tracking-[0.18em] text-fg">
        IT<span className="font-bold">CITADEL</span>
      </span>
    </span>
  )
}
