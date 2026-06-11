/**
 * All money in the app is stored as integer cents. These helpers are the
 * only place that converts between cents, numbers, and display strings.
 */

const eurFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

const eurWholeFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** 1234 -> "€ 12,34" */
export function formatCents(cents) {
  return eurFormatter.format(cents / 100)
}

/** 123400 -> "€ 1.234" — for big headline numbers */
export function formatCentsWhole(cents) {
  return eurWholeFormatter.format(cents / 100)
}

/**
 * Parse user/CSV input into integer cents. Handles both "12.34" and the
 * Dutch "12,34", thousand separators, currency symbols, and signs.
 * Returns null when the input isn't a usable number.
 */
export function parseToCents(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) : null
  }
  if (typeof input !== 'string') return null

  let s = input.trim().replace(/[€$£\s]/g, '')
  if (!s) return null

  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (s.startsWith('-')) { negative = true; s = s.slice(1) }
  if (s.startsWith('+')) s = s.slice(1)

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma > -1 && lastDot > -1) {
    // Both present: the later one is the decimal separator
    const dec = Math.max(lastComma, lastDot)
    s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1)
  } else if (lastComma > -1) {
    const digitsAfter = s.length - lastComma - 1
    // "1,234" with exactly 3 digits could be a thousands sep, but in EU
    // exports a single comma is virtually always decimal — treat it so,
    // unless there are multiple commas ("1,234,567").
    s = s.split(',').length > 2
      ? s.replace(/,/g, '')
      : digitsAfter === 3 && /^\d{1,3},\d{3}$/.test(s) === false
        ? s.replace(',', '.')
        : s.replace(',', '.')
  } else if (lastDot > -1 && s.split('.').length > 2) {
    s = s.replace(/\./g, '')
  }

  const value = Number(s)
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value * 100)
  return negative ? -cents : cents
}

export function sumCents(items, pick = (x) => x.amountCents) {
  return items.reduce((acc, item) => acc + pick(item), 0)
}
