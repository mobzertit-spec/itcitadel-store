import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A native modal <dialog> driven by `open`: it traps focus, closes on Escape and on a click outside its content,
 * and slides in and out through CSS (index.css: dialog.sheet, .quick, .drawer). Its content exists only while it
 * is open, and for the moment it takes to slide away.
 */
export function Sheet({ open, onClose, labelledBy, className, children }: { open: boolean; onClose: () => void; labelledBy: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [drawn, setDrawn] = useState(open)
  if (open && !drawn) setDrawn(true)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
    if (open) return
    const timer = setTimeout(() => setDrawn(false), 400)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} className={`sheet ${className}`}>
      {drawn && children}
    </dialog>
  )
}
