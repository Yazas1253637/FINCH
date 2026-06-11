import { useMemo } from 'react'
import { useStore } from '../store/StoreProvider.jsx'
import { monthKeyOf, daysInMonth } from '../utils/dates.js'
import { allOccurrencesInMonth } from '../utils/recurrence.js'

/**
 * Derived view-model for one month. Merges one-off expenses with the
 * concrete charges produced by recurring expenses, so totals, charts
 * and goals all see one unified list of "entries".
 */
export function useMonthData(monthKey) {
  const { state } = useStore()

  return useMemo(() => {
    const expenses = state.expenses
      .filter((e) => monthKeyOf(e.date) === monthKey)
      .sort((a, b) => b.date.localeCompare(a.date))

    const recurringCharges = allOccurrencesInMonth(state.recurring, monthKey)
      .map((occ) => ({
        id: `${occ.recurringId}@${occ.date}`,
        amountCents: occ.amountCents,
        categoryId: occ.categoryId,
        date: occ.date,
        note: occ.name,
        recurringId: occ.recurringId,
      }))

    const entries = [...expenses, ...recurringCharges]
      .sort((a, b) => b.date.localeCompare(a.date))

    const totalCents = entries.reduce((acc, e) => acc + e.amountCents, 0)

    const byCategory = new Map()
    for (const e of entries) {
      const key = e.categoryId ?? 'cat-other'
      byCategory.set(key, (byCategory.get(key) ?? 0) + e.amountCents)
    }

    // Cumulative spend per day — feeds the trend chart.
    const dim = daysInMonth(monthKey)
    const perDay = new Array(dim).fill(0)
    for (const e of entries) {
      const day = Number(e.date.slice(8, 10))
      if (day >= 1 && day <= dim) perDay[day - 1] += e.amountCents
    }
    let running = 0
    const cumulative = perDay.map((cents, i) => {
      running += cents
      return { day: i + 1, dayCents: cents, cumulativeCents: running }
    })

    // The overview list hides one-off expenses categorized as Subscriptions —
    // those are routed to the Subscriptions tab. Totals/charts still count them.
    const visibleEntries = entries.filter(
      (e) => e.recurringId || e.categoryId !== 'cat-subscriptions',
    )

    return { expenses, recurringCharges, entries, visibleEntries, totalCents, byCategory, cumulative }
  }, [state.expenses, state.recurring, monthKey])
}

/** Earliest month that has any expense — bounds the month tab list. */
export function useEarliestMonth() {
  const { state } = useStore()
  return useMemo(() => {
    if (state.expenses.length === 0) return null
    return state.expenses.reduce(
      (min, e) => (monthKeyOf(e.date) < min ? monthKeyOf(e.date) : min),
      monthKeyOf(state.expenses[0].date),
    )
  }, [state.expenses])
}

/** Categories indexed by id, with a guaranteed fallback for unknown ids. */
export function useCategoryIndex() {
  const { state } = useStore()
  return useMemo(() => {
    const index = new Map(state.categories.map((c) => [c.id, c]))
    return (id) =>
      index.get(id) ?? { id: 'cat-other', name: 'Other', color: '#b5b1a4', icon: 'dots' }
  }, [state.categories])
}
