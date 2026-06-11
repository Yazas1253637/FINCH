/**
 * Poolsuite header: a centered Times-serif wordmark flanked by beveled
 * retro buttons. (Light-only theme — no mode toggle.)
 */
export function Header({ onOpenSettings }) {
  return (
    <header className="flex items-center justify-between pt-8 pb-3 sm:pt-12">
      <div className="w-10" aria-hidden />

      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.18em]">
          FINCH
        </h1>
        <span className="text-pixel hidden text-[0.5rem] uppercase tracking-[0.3em] text-ink-faint sm:block">
          expenses · quietly kept
        </span>
      </div>

      <button
        onClick={onOpenSettings}
        title="Settings"
        className="grid h-10 w-10 place-items-center rounded-[6px] border-[1.5px] border-ink
          bg-paper-raised shadow-card transition-transform active:translate-x-[1px] active:translate-y-[1px]
          active:shadow-none"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="1.9" fill="var(--color-paper-raised)" />
          <circle cx="15" cy="12" r="1.9" fill="var(--color-paper-raised)" />
          <circle cx="7" cy="17" r="1.9" fill="var(--color-paper-raised)" />
        </svg>
      </button>
    </header>
  )
}
