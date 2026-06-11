import { monthKeyOf, monthRange, daysInMonth } from './dates.js'
import { allOccurrencesInMonth } from './recurrence.js'

/**
 * Goal model:
 *   { id, scope: 'overall' | <categoryId>, period: 'monthly'|'weekly'|'custom',
 *     from?, to?, amountCents }
 *
 * Progress is always "spend inside the goal's current window vs its budget".
 */

/** ISO Monday of the week containing `date`. */
export function weekStartISO(d = new Date()) {
  const day = (d.getDay() + 6) % 7 // Mon=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

export function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** The concrete [from, to] window a goal covers, given the viewed month. */
export function goalWindow(goal, monthKey) {
  if (goal.period === 'monthly') {
    return { from: `${monthKey}-01`, to: `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, '0')}` }
  }
  if (goal.period === 'weekly') {
    const from = weekStartISO()
    return { from, to: addDaysISO(from, 6) }
  }
  return { from: goal.from, to: goal.to } // custom
}

/**
 * Total spend (one-off + recurring charges) within [from, to], optionally
 * restricted to one category.
 */
export function spendInRange(state, from, to, scope = 'overall') {
  const inScope = (categoryId) => scope === 'overall' || categoryId === scope
  let total = 0

  for (const e of state.expenses) {
    if (e.date >= from && e.date <= to && inScope(e.categoryId)) total += e.amountCents
  }
  for (const monthKey of monthRange(monthKeyOf(from), monthKeyOf(to))) {
    for (const occ of allOccurrencesInMonth(state.recurring, monthKey)) {
      if (occ.date >= from && occ.date <= to && inScope(occ.categoryId ?? 'cat-other')) {
        total += occ.amountCents
      }
    }
  }
  return total
}

/** Rating thresholds: under 70% on track, 70–100% caution, over 100% over. */
export function ratingOf(spentCents, goalCents) {
  const pct = goalCents > 0 ? (spentCents / goalCents) * 100 : 0
  const tone = pct < 70 ? 'ok' : pct <= 100 ? 'warn' : 'over'
  return { pct, tone }
}

export function goalProgress(state, goal, monthKey) {
  const { from, to } = goalWindow(goal, monthKey)
  const spentCents = spendInRange(state, from, to, goal.scope)
  const remainingCents = Math.max(0, goal.amountCents - spentCents)
  return { from, to, spentCents, remainingCents, ...ratingOf(spentCents, goal.amountCents) }
}
