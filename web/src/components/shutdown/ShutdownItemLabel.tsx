import { ArrowRight } from 'lucide-react'

function SunMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-[1em] w-[1em] shrink-0" aria-hidden>
      <circle cx="16" cy="16" r="5.25" fill={color} />
      <g stroke={color} strokeWidth="2.15" strokeLinecap="round" fill="none">
        <path d="M16 3.2v3.1M16 25.7v3.1M6.2 6.2l2.2 2.2M23.6 23.6l2.2 2.2M3.2 16h3.1M25.7 16h3.1M6.2 25.8l2.2-2.2M23.6 8.4l2.2-2.2" />
      </g>
    </svg>
  )
}

/** Rich rendering of known routine steps; anything else shows as written. */
export function ShutdownItemLabel({ text, showMedia = true }: { text: string; showMedia?: boolean }) {
  const lower = text.toLowerCase()

  if (lower.includes('supplement')) {
    return (
      <>
        Take your supplements{' '}
        <span className="font-semibold underline underline-offset-2">NOW</span> before you continue
      </>
    )
  }

  if (lower.includes('plan tomorrow')) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        Plan tomorrow
        <SunMark color="#facc15" />
        <span className="font-medium opacity-60">{'&'}</span>
        <SunMark color="#fb923c" />
      </span>
    )
  }

  if (lower.includes('yoga')) {
    return (
      <span className="flex flex-col items-center gap-3">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          Take yoga mat
          <ArrowRight className="h-[0.9em] w-[0.9em] shrink-0 opacity-60" strokeWidth={2.25} />
          now do some yoga with Bend 😊
        </span>
        {showMedia && (
          <img
            src="/yoga-foam-roll.gif"
            alt="Yoga foam roll with Bend"
            className="w-full max-w-[14rem] rounded-xl border border-[var(--color-border)]"
          />
        )}
      </span>
    )
  }

  if (lower.includes('intention')) {
    return (
      <>
        <span className="italic underline decoration-2 underline-offset-2 text-[var(--color-bad)]">
          Intention
        </span>
        {' + Google Calendar'}
      </>
    )
  }

  return <>{text}</>
}
