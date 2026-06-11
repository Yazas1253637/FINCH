import { formatCents } from '../../utils/money.js'
import { monthLabel, addMonths } from '../../utils/dates.js'

/**
 * The hero total rendered as a Poolsuite-style dot-matrix LCD panel:
 * dark green-black readout, glowing mint digits, chrome strips top and
 * bottom, fine scanlines. Replaces the plain total card on Overview.
 */
export function LcdTotal({ monthKey, totalCents, prevTotalCents, span = '' }) {
  const prevKey = addMonths(monthKey, -1)
  const deltaCents = totalCents - prevTotalCents
  const up = deltaCents > 0

  return (
    <div
      className={`lcd-panel lcd-scan crt relative overflow-hidden rounded-card border-[1.5px]
        border-ink shadow-card ${span}`}
    >
      {/* Top chrome strip */}
      <div className="flex items-center justify-between border-b border-[#2c3a30] px-4 py-2">
        <span className="text-pixel text-[0.5rem] uppercase tracking-[0.25em] lcd-dim">
          {monthLabel(monthKey)} · total spent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-[2px] border border-[#3a4f42] px-1.5 py-0.5 text-[0.5rem] font-bold tracking-widest lcd-dim">
            EUR
          </span>
          <span className="rounded-[2px] bg-[#2f8f63] px-1.5 py-0.5 text-[0.5rem] font-bold tracking-widest text-[#0c1410]">
            DIGITAL
          </span>
        </span>
      </div>

      {/* The readout */}
      <div className="px-4 py-6 sm:py-7">
        <p className="lcd-glow font-[family-name:var(--font-sans)] text-4xl font-bold tnum sm:text-5xl">
          {formatCents(totalCents)}
          <span className="ml-1 inline-block animate-pulse">▌</span>
        </p>
      </div>

      {/* Bottom chrome strip — delta vs previous month */}
      <div className="flex items-center justify-between border-t border-[#2c3a30] px-4 py-2">
        {prevTotalCents > 0 ? (
          <span className="text-[0.625rem] uppercase tracking-[0.12em] tnum">
            <span className={up ? 'text-[#e0a94a]' : 'text-[#6fcf9f]'}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{formatCents(deltaCents)}
            </span>{' '}
            <span className="lcd-dim">vs {monthLabel(prevKey)}</span>
          </span>
        ) : (
          <span className="text-[0.625rem] uppercase tracking-[0.12em] lcd-dim">
            No prior data
          </span>
        )}
        <span className="text-pixel text-[0.5rem] uppercase tracking-[0.25em] lcd-dim">
          Finch Sound
        </span>
      </div>
    </div>
  )
}
