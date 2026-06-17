import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { getAccessPin, setAccessPin } from '../lib/auth'
import { checkPinRequired, verifyPin } from '../lib/sync'
import { Btn, Card, Input } from './ui'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [required, setRequired] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(() => !!getAccessPin())

  useEffect(() => {
    checkPinRequired().then((req) => {
      setRequired(req)
      if (!req || getAccessPin()) setUnlocked(true)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
        Laden…
      </div>
    )
  }

  if (!required || unlocked) return <>{children}</>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = await verifyPin(pin)
    if (!ok) {
      setError('Onjuiste PIN')
      return
    }
    setAccessPin(pin)
    setUnlocked(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text)]">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Zebbi OS</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Voer je PIN in om je data te openen. Dezelfde PIN op laptop en telefoon.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-[var(--color-bad)]">{error}</p>}
          <Btn type="submit" className="w-full">
            Openen
          </Btn>
        </form>
      </Card>
    </div>
  )
}
