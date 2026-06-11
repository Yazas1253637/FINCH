import { formatCents } from '../../utils/money.js'

/** Shared tooltip card for all charts. */
export function ChartTooltip({ title, rows }) {
  return (
    <div className="rounded-xl border border-line/70 bg-paper-raised px-3.5 py-2.5 shadow-card
      dark:border-night-line/70 dark:bg-night-raised dark:shadow-card-dark">
      {title && <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint dark:text-snow-faint">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-baseline justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-ink-soft dark:text-snow-soft">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tnum font-medium">{formatCents(r.cents)}</span>
        </p>
      ))}
    </div>
  )
}

export function EmptyChart({ note }) {
  return (
    <div className="grid h-48 place-items-center">
      <p className="max-w-[22ch] text-center text-sm leading-relaxed text-ink-faint dark:text-snow-faint">{note}</p>
    </div>
  )
}
