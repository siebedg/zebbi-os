import { useEffect, useState } from 'react'
import { Delete, Lock } from 'lucide-react'
import { AUTH_LOST_EVENT, clearAccessPin, getAccessPin, setAccessPin } from '../lib/auth'
import { APP_PIN } from '../lib/pinConfig'
import { checkPinRequired, verifyPin } from '../lib/sync'
import { Btn, Card } from './ui'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [required, setRequired] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const req = await checkPinRequired()
      if (cancelled) return
      // Always gate with local APP_PIN if API says no PIN — personal lock screen
      setRequired(req || Boolean(APP_PIN))

      if (!req && !APP_PIN) {
        setUnlocked(true)
        setChecking(false)
        return
      }

      const stored = getAccessPin()
      if (stored) {
        const ok = (await verifyPin(stored)) || stored === APP_PIN
        if (ok) {
          setAccessPin(stored)
          setUnlocked(true)
          setChecking(false)
          return
        }
        clearAccessPin()
      }
      setUnlocked(false)
      setChecking(false)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onAuthLost = () => {
      clearAccessPin()
      setUnlocked(false)
      setError('Sessie verlopen — voer je PIN opnieuw in.')
      setPin('')
    }
    window.addEventListener(AUTH_LOST_EVENT, onAuthLost)
    return () => window.removeEventListener(AUTH_LOST_EVENT, onAuthLost)
  }, [])

  const tryUnlock = async (candidate: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const ok = (await verifyPin(candidate)) || candidate === APP_PIN
    if (!ok) {
      setError('Onjuiste PIN')
      setPin('')
      setBusy(false)
      return
    }
    setAccessPin(candidate)
    setUnlocked(true)
    window.location.reload()
  }

  const onDigit = (d: string) => {
    if (busy) return
    setError(null)
    const next = (pin + d).slice(0, 8)
    setPin(next)
    if (next.length >= APP_PIN.length) {
      void tryUnlock(next)
    }
  }

  const onDelete = () => {
    setError(null)
    setPin((p) => p.slice(0, -1))
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
        Laden…
      </div>
    )
  }

  if (!required || unlocked) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text)]">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Zebbi OS</h2>
        </div>
        <p className="mb-5 text-sm text-[var(--color-muted)]">Tik je PIN</p>

        <div className="mb-5 flex justify-center gap-2.5">
          {Array.from({ length: Math.max(APP_PIN.length, 4) }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border transition ${
                i < pin.length
                  ? 'border-[var(--color-text)] bg-[var(--color-text)]'
                  : 'border-[var(--color-border)] bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && <p className="mb-3 text-center text-sm text-[var(--color-bad)]">{error}</p>}

        <div className="mx-auto grid max-w-[16rem] grid-cols-3 gap-2">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={`empty-${i}`} />
            if (k === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={onDelete}
                  className="flex h-14 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] text-[var(--color-muted)] active:scale-95"
                  aria-label="Wis"
                >
                  <Delete className="h-5 w-5" />
                </button>
              )
            }
            return (
              <button
                key={k}
                type="button"
                onClick={() => onDigit(k)}
                className="h-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xl font-semibold tabular-nums text-[var(--color-text)] transition hover:bg-[var(--color-surface-overlay)] active:scale-95"
              >
                {k}
              </button>
            )
          })}
        </div>

        {pin.length > 0 && pin.length < APP_PIN.length && (
          <div className="mt-4">
            <Btn type="button" variant="ghost" className="w-full !text-xs" onClick={() => void tryUnlock(pin)}>
              Openen
            </Btn>
          </div>
        )}
      </Card>
    </div>
  )
}
