import { useMemo } from 'react'
import { useStore } from '../store/StoreProvider.jsx'
import { monthKeyOf, currentMonthKey, addMonths, monthShortLabel, monthLabel } from '../utils/dates.js'
import { allOccurrencesInMonth } from '../utils/recurrence.js'

/**
 * Per-month totals over a trailing window, merging one-off expenses with
 * recurring charges (reusing allOccurrencesInMonth — same source the monthly
 * overview uses, no reimplementation).
 *
 * The window is clamped to the earliest month that actually has data, so a
 * user with 3 months of history sees 3 bars — never fake zero months that
 * would flatten the axis. Real €0 months *inside* the history are kept.
 */
export function useMultiMonthData(monthsBack) {
  const { state } = useStore()

  return useMemo(() => {
    const earliest = earliestDataMonth(state)
    const current = currentMonthKey()

    // Desired window start, clamped forward to the first month with data.
    const windowStart = addMonths(current, -(monthsBack - 1))
    const start = earliest && earliest > windowStart ? earliest : windowStart

    const months = []
    for (let k = start; k <= current; k = addMonths(k, 1)) {
      const expenses = state.expenses.filter((e) => monthKeyOf(e.date) === k)
      const charges = allOccurrencesInMonth(state.recurring, k)

      const byCategory = new Map()
      let totalCents = 0
      for (const e of [...expenses, ...charges.map((c) => ({ amountCents: c.amountCents, categoryId: c.categoryId }))]) {
        const cat = e.categoryId ?? 'cat-other'
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.amountCents)
        totalCents += e.amountCents
      }

      months.push({ monthKey: k, short: monthShortLabel(k), label: monthLabel(k), totalCents, byCategory })
    }

    // Category ids present anywhere in the window, ranked by total spend.
    const catTotals = new Map()
    for (const m of months) {
      for (const [cat, cents] of m.byCategory) {
        catTotals.set(cat, (catTotals.get(cat) ?? 0) + cents)
      }
    }
    const categoryIds = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)

    const windowTotal = months.reduce((acc, m) => acc + m.totalCents, 0)
    const avgPerMonth = months.length ? Math.round(windowTotal / months.length) : 0

    return { months, categoryIds, windowTotal, avgPerMonth, truncated: months.length < monthsBack }
  }, [state.expenses, state.recurring, monthsBack])
}

/** Earliest month with any data — across one-off expenses and sub start dates. */
function earliestDataMonth(state) {
  let earliest = null
  for (const e of state.expenses) {
    const k = monthKeyOf(e.date)
    if (!earliest || k < earliest) earliest = k
  }
  for (const r of state.recurring) {
    if (r.status === 'archived') continue
    const k = monthKeyOf(r.startDate)
    if (!earliest || k < earliest) earliest = k
  }
  return earliest
}
