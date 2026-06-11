import { useEffect } from 'react'

/**
 * Modal surface: bottom sheet on mobile, centered card on desktop.
 * Closes on backdrop click and Escape.
 */
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-label={title}>
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/50"
        onClick={onClose}
      />
      <div className="animate-rise relative w-full max-w-lg rounded-t-card border-[1.5px] border-ink
        bg-paper-raised p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card
        sm:rounded-card sm:p-6 max-h-[88dvh] overflow-y-auto">
        <div className="-mx-5 -mt-5 mb-5 flex items-center justify-between rounded-t-[8px] bg-ink px-4 py-2.5 sm:-mx-6 sm:-mt-6 sm:px-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-paper-raised">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-[5px] border border-paper-raised/40
              text-paper-raised transition-colors hover:bg-paper-raised hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* Shared form atoms — keep every sheet visually identical. */

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.625rem] font-bold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  )
}

export const inputClass = `w-full rounded-[6px] border-[1.5px] border-ink bg-paper px-3.5 py-2.5 text-[15px]
  outline-none transition-shadow placeholder:text-ink-faint
  focus:shadow-[2px_2px_0_0_var(--color-ink)]`

/* Beveled retro button — depresses on press (shadow collapses). */
const bevel =
  'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-card'

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-[6px] border-[1.5px] border-ink bg-pink px-5 py-3 text-sm font-bold
        uppercase tracking-[0.06em] text-ink shadow-card ${bevel}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, danger = false, ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-[6px] border-[1.5px] border-ink px-5 py-3 text-sm font-bold
        uppercase tracking-[0.06em] shadow-card ${bevel}
        ${danger ? 'bg-over/15 text-over' : 'bg-paper-raised text-ink'}`}
    >
      {children}
    </button>
  )
}
