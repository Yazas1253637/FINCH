import { useMemo, useRef, useEffect } from 'react'
import { currentMonthKey, monthRange, addMonths, monthShortLabel } from '../../utils/dates.js'

/**
 * Horizontal month switcher. Shows a window of months ending at the current
 * one (plus any earlier months that contain data), scrollable on mobile.
 */
export function MonthTabs({ selected, onSelect, earliestWithData }) {
  const months = useMemo(() => {
    const now = currentMonthKey()
    const earliest = earliestWithData && earliestWithData < now
      ? earliestWithData
      : addMonths(now, -5)
    return monthRange(earliest, now)
  }, [earliestWithData])

  const scrollerRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <nav
      ref={scrollerRef}
      className="-mx-1 flex gap-1 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Months"
    >
      {months.map((key) => {
        const isSelected = key === selected
        const year = key.slice(0, 4)
        const showYear = key.endsWith('-01') || key === months[0]
        return (
          <button
            key={key}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelect(key)}
            className={`shrink-0 rounded-[6px] border-[1.5px] border-ink px-3.5 py-1.5 text-xs font-bold
              uppercase tracking-wide transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
              ${isSelected
                ? 'bg-pink text-ink shadow-card'
                : 'bg-paper-raised text-ink-soft hover:bg-pink-wash'}`}
          >
            {monthShortLabel(key)}
            {showYear && <span className="ml-1.5 text-[0.625rem] opacity-60 tnum">{year}</span>}
          </button>
        )
      })}
    </nav>
  )
}
