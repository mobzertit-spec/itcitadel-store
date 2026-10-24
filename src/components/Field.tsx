import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Common = { label: string; hint?: string; error?: string; name: string }

export function Field({ label, hint, error, name, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input id={name} name={name} className="field-input" aria-invalid={!!error} aria-describedby={`${name}-note`} {...input} />
      <Note id={`${name}-note`} hint={hint} error={error} />
    </div>
  )
}

export function TextArea({ label, hint, error, name, ...input }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <textarea id={name} name={name} rows={4} className="field-input h-auto resize-y py-3" aria-invalid={!!error} aria-describedby={`${name}-note`} {...input} />
      <Note id={`${name}-note`} hint={hint} error={error} />
    </div>
  )
}

function Note({ id, hint, error }: { id: string; hint?: string; error?: string }): ReactNode {
  if (error)
    return (
      <p id={id} className="mt-1.5 text-sm font-medium text-danger" role="alert">
        {error}
      </p>
    )
  return hint ? (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {hint}
    </p>
  ) : null
}

/**
 * Invisible to people, tempting to bots: a filled-in "website" field marks the form as spam.
 * Clipped in place (not pushed off-screen: a far negative offset becomes scrollable in right-to-left pages).
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )
}
