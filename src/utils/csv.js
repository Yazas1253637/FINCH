import { parseToCents } from './money.js'

/**
 * CSV import helpers: flexible date parsing, sign conventions, row
 * normalization and de-duplication. Pure functions — the wizard is UI only.
 */

/** Parse common bank-export date formats to "YYYY-MM-DD" (null if hopeless). */
export function parseDateFlexible(raw) {
  if (!raw) return null
  const s = String(raw).trim()

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) // ISO (possibly with time)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = s.match(/^(\d{4})(\d{2})(\d{2})$/) // YYYYMMDD (ING etc.)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/) // DD-MM-YYYY / MM/DD/YYYY
  if (m) {
    let [, a, b, year] = m
    let day = Number(a), month = Number(b)
    // EU default: first number is the day. Swap only when impossible.
    if (day <= 12 && month > 12) [day, month] = [month, day]
    if (month > 12 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

export const SIGN_CONVENTIONS = [
  { id: 'negative', label: 'Negative amounts are expenses' },
  { id: 'positive', label: 'Positive amounts are expenses' },
  { id: 'debitcredit', label: 'Separate debit/credit column' },
]

/** Guess the sign convention by looking at the parsed amounts. */
export function detectSignConvention(rows, amountField) {
  let negatives = 0, positives = 0
  for (const row of rows.slice(0, 200)) {
    const cents = parseToCents(row[amountField])
    if (cents == null) continue
    if (cents < 0) negatives++
    else if (cents > 0) positives++
  }
  // Mixed signs → classic bank export where spend is negative.
  return negatives > 0 ? 'negative' : 'positive'
}

/** Guess column mapping from header names. */
export function guessMapping(fields) {
  const find = (...patterns) =>
    fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p))) ?? ''
  return {
    date: find('date', 'datum', 'boekdatum'),
    amount: find('amount', 'bedrag', 'value'),
    description: find('description', 'omschrijving', 'name', 'naam', 'mededeling', 'memo', 'payee'),
    category: find('category', 'categorie'),
    debitCredit: find('af bij', 'af/bij', 'debit/credit', 'd/c', 'dc'),
  }
}

/**
 * Normalize one raw CSV row into an expense candidate.
 * Returns { ok, date, amountCents, description, rawCategory, reason }.
 * Income rows (per convention) come back with isIncome: true.
 */
export function normalizeRow(row, mapping, signConvention) {
  const date = parseDateFlexible(row[mapping.date])
  if (!date) return { ok: false, reason: 'unreadable date' }

  let cents = parseToCents(row[mapping.amount])
  if (cents == null || cents === 0) return { ok: false, reason: 'unreadable amount' }

  let isIncome = false
  if (signConvention === 'debitcredit' && mapping.debitCredit) {
    const dc = String(row[mapping.debitCredit] ?? '').trim().toLowerCase()
    // "Af" (NL) / debit / D = money out
    const isDebit = ['af', 'debit', 'd', 'dr'].includes(dc)
    isIncome = !isDebit
    cents = Math.abs(cents)
  } else if (signConvention === 'negative') {
    isIncome = cents > 0
    cents = Math.abs(cents)
  } else {
    isIncome = cents < 0
    cents = Math.abs(cents)
  }

  return {
    ok: true,
    isIncome,
    date,
    amountCents: cents,
    description: String(row[mapping.description] ?? '').trim(),
    rawCategory: mapping.category ? String(row[mapping.category] ?? '').trim() : '',
  }
}

/** Stable de-dup key: same date + amount + description = same expense. */
export function dedupeKey(date, amountCents, description) {
  return `${date}|${amountCents}|${description.toLowerCase().trim()}`
}

export function existingKeys(expenses) {
  return new Set(expenses.map((e) => dedupeKey(e.date, e.amountCents, e.note ?? '')))
}
