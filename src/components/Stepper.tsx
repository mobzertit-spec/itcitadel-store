import { Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY } from '@shared/validate'

/** − 1 + : how many subscriptions (or users). */
export function Stepper({ value, onChange, label, size = 'md' }: { value: number; onChange: (n: number) => void; label: string; size?: 'md' | 'sm' }) {
  const box = size === 'sm' ? 'h-10' : 'h-14'
  const btn = `inline-flex ${size === 'sm' ? 'w-10' : 'w-12'} ${box} items-center justify-center text-fg transition hover:text-white disabled:opacity-30`
  return (
    <div className={`inline-flex items-center rounded-full border border-line bg-raised ${box}`} dir="ltr" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="−">
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={value}
        onChange={(e) => onChange(Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
        className="latin w-10 bg-transparent text-center font-bold text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={label}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))} disabled={value >= MAX_QUANTITY} aria-label="+">
        <Plus className="size-4" />
      </button>
    </div>
  )
}
