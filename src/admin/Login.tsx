import { useState, type FormEvent } from 'react'
import { LogoMark } from '@/components/Logo'
import { db } from './db'

export default function Login() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    const { error } = await db.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) })
    setBusy(false)
    if (error) setError('البريد أو كلمة المرور غير صحيحة.')
  }

  return (
    <div lang="ar" dir="rtl" className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-5 p-8">
        <div className="flex items-center gap-2 text-lg font-bold">
          <LogoMark /> لوحة تحكم ITCITADEL
        </div>
        <label className="block">
          <span className="field-label">البريد الإلكتروني</span>
          <input name="email" type="email" required autoComplete="username" dir="ltr" className="field-input" />
        </label>
        <label className="block">
          <span className="field-label">كلمة المرور</span>
          <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="field-input" />
        </label>
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <button className="btn-light w-full" disabled={busy}>
          {busy ? '…' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
