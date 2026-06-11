/** Month keys are "YYYY-MM" strings — stable, sortable, timezone-safe. */

export function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7)
}

export function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addMonths(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabelFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })
const monthShortFormatter = new Intl.DateTimeFormat('en', { month: 'short' })

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return monthLabelFormatter.format(new Date(y, m - 1, 1))
}

export function monthShortLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return monthShortFormatter.format(new Date(y, m - 1, 1))
}

/** Inclusive list of month keys from `from` to `to` (both "YYYY-MM"). */
export function monthRange(from, to) {
  const keys = []
  let k = from
  while (k <= to) {
    keys.push(k)
    k = addMonths(k, 1)
  }
  return keys
}

export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Add (or subtract) days to a "YYYY-MM-DD" string, returning the same shape. */
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
