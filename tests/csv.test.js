import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDateFlexible, normalizeRow, dedupeKey, detectSignConvention, existingKeys } from '../src/utils/csv.js'

test('parseDateFlexible handles ISO, compact, EU and US formats', () => {
  assert.equal(parseDateFlexible('2026-06-11'), '2026-06-11')
  assert.equal(parseDateFlexible('2026-06-11 14:03:00'), '2026-06-11')
  assert.equal(parseDateFlexible('20260611'), '2026-06-11')
  assert.equal(parseDateFlexible('11-06-2026'), '2026-06-11')
  assert.equal(parseDateFlexible('11/06/2026'), '2026-06-11')
  assert.equal(parseDateFlexible('06/25/2026'), '2026-06-25') // day>12 → US order
  assert.equal(parseDateFlexible('not a date'), null)
})

const mapping = { date: 'Datum', amount: 'Bedrag', description: 'Omschrijving', category: '', debitCredit: 'Af Bij' }

test('normalizeRow: Dutch comma decimals and debit/credit column', () => {
  const row = { Datum: '11-06-2026', Bedrag: '15,99', Omschrijving: 'Netflix', 'Af Bij': 'Af' }
  const n = normalizeRow(row, mapping, 'debitcredit')
  assert.equal(n.ok, true)
  assert.equal(n.isIncome, false)
  assert.equal(n.amountCents, 1599)
  assert.equal(n.date, '2026-06-11')
})

test('normalizeRow: credit rows flagged as income', () => {
  const row = { Datum: '11-06-2026', Bedrag: '250,00', Omschrijving: 'Salary', 'Af Bij': 'Bij' }
  assert.equal(normalizeRow(row, mapping, 'debitcredit').isIncome, true)
})

test('normalizeRow: negative-is-expense convention', () => {
  const m = { ...mapping, debitCredit: '' }
  const spend = normalizeRow({ Datum: '01-06-2026', Bedrag: '-12,50', Omschrijving: 'Cafe' }, m, 'negative')
  assert.equal(spend.isIncome, false)
  assert.equal(spend.amountCents, 1250)
  const income = normalizeRow({ Datum: '01-06-2026', Bedrag: '100,00', Omschrijving: 'Refund' }, m, 'negative')
  assert.equal(income.isIncome, true)
})

test('normalizeRow rejects bad rows with a reason', () => {
  assert.equal(normalizeRow({ Datum: '??', Bedrag: '1,00', Omschrijving: 'x' }, mapping, 'negative').reason, 'unreadable date')
  assert.equal(normalizeRow({ Datum: '01-06-2026', Bedrag: 'abc', Omschrijving: 'x' }, mapping, 'negative').reason, 'unreadable amount')
})

test('detectSignConvention: mixed signs means negative-is-expense', () => {
  const rows = [{ a: '-5,00' }, { a: '10,00' }, { a: '-2,50' }]
  assert.equal(detectSignConvention(rows, 'a'), 'negative')
  assert.equal(detectSignConvention([{ a: '5,00' }], 'a'), 'positive')
})

test('dedupeKey is case- and whitespace-insensitive on description', () => {
  assert.equal(dedupeKey('2026-06-11', 1599, 'Netflix '), dedupeKey('2026-06-11', 1599, 'netflix'))
  assert.notEqual(dedupeKey('2026-06-11', 1599, 'Netflix'), dedupeKey('2026-06-12', 1599, 'Netflix'))
})

/* ---------------- de-dupe against existing data (date + amount + description) ---------------- */

test('exact duplicate is rejected against existing expenses', () => {
  const keys = existingKeys([{ date: '2026-06-11', amountCents: 1599, note: 'Netflix' }])
  assert.ok(keys.has(dedupeKey('2026-06-11', 1599, 'Netflix')))
})

test('near-misses are kept — any of date/amount/description differing makes a new key', () => {
  const keys = existingKeys([{ date: '2026-06-11', amountCents: 1599, note: 'Netflix' }])
  assert.ok(!keys.has(dedupeKey('2026-06-12', 1599, 'Netflix')), 'different day kept')
  assert.ok(!keys.has(dedupeKey('2026-06-11', 1600, 'Netflix')), 'one cent off kept')
  assert.ok(!keys.has(dedupeKey('2026-06-11', 1599, 'Spotify')), 'different payee kept')
})

test('existingKeys treats a missing note as empty string', () => {
  const keys = existingKeys([{ date: '2026-06-11', amountCents: 500 }])
  assert.ok(keys.has(dedupeKey('2026-06-11', 500, '')))
})

// Mirror the wizard's commit step: normalize → drop income → skip seen keys.
function importFile(file, mapping, signConvention, existingExpenses) {
  const keys = existingKeys(existingExpenses)
  const added = []
  for (const raw of file) {
    const n = normalizeRow(raw, mapping, signConvention)
    if (!n.ok || n.isIncome) continue
    const key = dedupeKey(n.date, n.amountCents, n.description)
    if (keys.has(key)) continue
    keys.add(key) // guards against duplicates within the same file
    added.push({ date: n.date, amountCents: n.amountCents, note: n.description })
  }
  return added
}

const importMapping = { date: 'd', amount: 'a', description: 'desc', category: '', debitCredit: '' }

test('re-importing the same file twice adds nothing the second time', () => {
  const file = [
    { d: '01-06-2026', a: '-15,99', desc: 'Netflix' },
    { d: '02-06-2026', a: '-9,99', desc: 'Spotify' },
    { d: '03-06-2026', a: '-48,25', desc: 'Albert Heijn' },
  ]
  const first = importFile(file, importMapping, 'negative', [])
  assert.equal(first.length, 3)
  const second = importFile(file, importMapping, 'negative', first)
  assert.equal(second.length, 0)
})

test('a duplicated line within one file is imported only once', () => {
  const file = [
    { d: '01-06-2026', a: '-15,99', desc: 'Netflix' },
    { d: '01-06-2026', a: '-15,99', desc: 'Netflix' },
  ]
  assert.equal(importFile(file, importMapping, 'negative', []).length, 1)
})
