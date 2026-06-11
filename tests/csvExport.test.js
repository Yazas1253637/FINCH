import { test } from 'node:test'
import assert from 'node:assert/strict'
import Papa from 'papaparse'
import { buildExpenseCSV } from '../src/utils/csvExport.js'
import { normalizeRow, dedupeKey } from '../src/utils/csv.js'

const CATEGORIES = [
  { id: 'cat-groceries', name: 'Groceries' },
  { id: 'cat-subscriptions', name: 'Subscriptions' },
]

const EXPENSES = [
  { id: 'e2', date: '2026-06-08', amountCents: 4825, categoryId: 'cat-groceries', note: 'Albert Heijn' },
  { id: 'e1', date: '2026-06-01', amountCents: 1299, categoryId: 'cat-subscriptions', note: 'xbox gamepass' },
  { id: 'e3', date: '2026-06-10', amountCents: 50000, categoryId: 'cat-groceries', note: '' },
]

test('buildExpenseCSV writes header + a row per expense, date-sorted', () => {
  const csv = buildExpenseCSV(EXPENSES, CATEGORIES)
  const lines = csv.trim().split(/\r?\n/)
  assert.equal(lines[0], 'Date,Amount,Category,Note')
  assert.equal(lines.length, 4) // header + 3
  assert.match(lines[1], /^2026-06-01,/) // earliest first
  assert.match(lines[3], /^2026-06-10,/)
})

test('amounts are comma-decimal and category names resolved', () => {
  const rows = Papa.parse(buildExpenseCSV(EXPENSES, CATEGORIES), { header: true }).data
  const ah = rows.find((r) => r.Note === 'Albert Heijn')
  assert.equal(ah.Amount, '48,25')
  assert.equal(ah.Category, 'Groceries')
  const xbox = rows.find((r) => r.Note === 'xbox gamepass')
  assert.equal(xbox.Amount, '12,99')
  assert.equal(xbox.Category, 'Subscriptions')
})

test('unknown category falls back to Other', () => {
  const csv = buildExpenseCSV(
    [{ date: '2026-06-01', amountCents: 100, categoryId: 'cat-ghost', note: 'x' }],
    CATEGORIES,
  )
  const row = Papa.parse(csv, { header: true }).data[0]
  assert.equal(row.Category, 'Other')
})

test('round-trip: exported CSV re-imports to the same amounts (no drift)', () => {
  const csv = buildExpenseCSV(EXPENSES, CATEGORIES)
  const parsed = Papa.parse(csv, { header: true }).data.filter((r) => r.Date)
  const mapping = { date: 'Date', amount: 'Amount', description: 'Note', category: 'Category', debitCredit: '' }

  const reimported = parsed.map((r) => normalizeRow(r, mapping, 'positive'))
  for (const r of reimported) {
    assert.equal(r.ok, true)
    assert.equal(r.isIncome, false) // positive convention → all expenses
  }
  // amounts survive the round-trip exactly
  const byNote = Object.fromEntries(reimported.map((r) => [r.description, r.amountCents]))
  assert.equal(byNote['Albert Heijn'], 4825)
  assert.equal(byNote['xbox gamepass'], 1299)
})

test('round-trip then de-dupe: re-importing your own export adds nothing', () => {
  const csv = buildExpenseCSV(EXPENSES, CATEGORIES)
  const parsed = Papa.parse(csv, { header: true }).data.filter((r) => r.Date)
  const mapping = { date: 'Date', amount: 'Amount', description: 'Note', category: 'Category', debitCredit: '' }

  // existing keys from the original expenses
  const keys = new Set(EXPENSES.map((e) => dedupeKey(e.date, e.amountCents, e.note ?? '')))
  let added = 0
  for (const raw of parsed) {
    const n = normalizeRow(raw, mapping, 'positive')
    if (keys.has(dedupeKey(n.date, n.amountCents, n.description))) continue
    added++
  }
  assert.equal(added, 0)
})
