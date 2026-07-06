import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_FIELD_VISIBILITY,
  type FieldVisibility,
  type FieldVisibilityKey,
  loadFieldVisibility,
  saveFieldVisibility,
} from '../lib/fieldVisibility'

type FieldVisibilityContextValue = {
  visibility: FieldVisibility
  setVisible: (key: FieldVisibilityKey, visible: boolean) => void
}

const FieldVisibilityContext = createContext<FieldVisibilityContextValue | null>(null)

export function FieldVisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<FieldVisibility>(() => loadFieldVisibility())

  const setVisible = useCallback((key: FieldVisibilityKey, visible: boolean) => {
    setVisibility((prev) => {
      const next = { ...prev, [key]: visible }
      saveFieldVisibility(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ visibility, setVisible }), [visibility, setVisible])

  return (
    <FieldVisibilityContext.Provider value={value}>{children}</FieldVisibilityContext.Provider>
  )
}

export function useFieldVisibility(): FieldVisibilityContextValue {
  const ctx = useContext(FieldVisibilityContext)
  if (!ctx) {
    return {
      visibility: DEFAULT_FIELD_VISIBILITY,
      setVisible: () => {},
    }
  }
  return ctx
}
