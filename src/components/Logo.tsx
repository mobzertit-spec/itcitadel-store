/** The ITCITADEL mark: a citadel wall with a green gate, on an ink tile. Temporary until the official logo arrives. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0d1b2e" />
      <path d="M7 25V10h3v3h4.5v-3h3v3H22v-3h3v15z" fill="#fff" />
      <path d="M13.5 25v-4.2a2.5 2.5 0 0 1 5 0V25z" fill="#16a36f" />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} dir="ltr">
      <LogoMark />
      <span className="text-[1.05rem] font-extrabold tracking-[0.08em] text-ink">
        IT<span className="text-brand">CITADEL</span>
      </span>
    </span>
  )
}
