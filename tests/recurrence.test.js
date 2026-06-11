import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  annualizedCents,
  projectCost,
  projectionLadder,
  occurrencesInMonth,
  occurrencesInRange,
} from '../src/utils/recurrence.js'
import { parseToCents } from '../src/utils/money.js'

/* ---------------- normalization: cycle → annual → N years ---------------- */

test('annualizedCents normalizes each cycle', () => {
  assert.equal(annualizedCents(1000, 'weekly'), 52000)
  assert.equal(annualizedCents(1599, 'monthly'), 19188)
  assert.equal(annualizedCents(3000, 'quarterly'), 12000)
  assert.equal(annualizedCents(9900, 'yearly'), 9900)
})

test('projectCost: €15.99/month over 1/2/5/10 years', () => {
  assert.equal(projectCost(1599, 'monthly', 1), 19188)
  assert.equal(projectCost(1599, 'monthly', 2), 38376)
  assert.equal(projectCost(1599, 'monthly', 5), 95940)
  assert.equal(projectCost(1599, 'monthly', 10), 191880)
})

test('projectionLadder returns the four standard horizons', () => {
  const ladder = projectionLadder(1000, 'yearly')
  assert.deepEqual(ladder.map((s) => s.years), [1, 2, 5, 10])
  assert.deepEqual(ladder.map((s) => s.totalCents), [1000, 2000, 5000, 10000])
})

test('unknown cycle throws', () => {
  assert.throws(() => annualizedCents(100, 'fortnightly'))
})

/* ---------------- occurrences in a month ---------------- */

const base = { id: 'r1', name: 'Test', amountCents: 1599, status: 'active', categoryId: null }

test('monthly bills once on the start day', () => {
  const r = { ...base, cycle: 'monthly', startDate: '2026-01-15' }
  const occ = occurrencesInMonth(r, '2026-06')
  assert.equal(occ.length, 1)
  assert.equal(occ[0].date, '2026-06-15')
  assert.equal(occ[0].amountCents, 1599)
})

test('monthly start day 31 clamps to short months', () => {
  const r = { ...base, cycle: 'monthly', startDate: '2026-01-31' }
  assert.equal(occurrencesInMonth(r, '2026-02')[0].date, '2026-02-28')
  assert.equal(occurrencesInMonth(r, '2026-04')[0].date, '2026-04-30')
})

test('no occurrences before startDate', () => {
  const r = { ...base, cycle: 'monthly', startDate: '2026-06-15' }
  assert.equal(occurrencesInMonth(r, '2026-05').length, 0)
  assert.equal(occurrencesInMonth(r, '2026-06').length, 1)
})

test('quarterly bills every third month from start', () => {
  const r = { ...base, cycle: 'quarterly', startDate: '2026-01-10' }
  assert.equal(occurrencesInMonth(r, '2026-01').length, 1)
  assert.equal(occurrencesInMonth(r, '2026-02').length, 0)
  assert.equal(occurrencesInMonth(r, '2026-04').length, 1)
  assert.equal(occurrencesInMonth(r, '2026-07').length, 1)
})

test('yearly bills on the anniversary month only', () => {
  const r = { ...base, cycle: 'yearly', startDate: '2025-03-05' }
  assert.equal(occurrencesInMonth(r, '2026-03').length, 1)
  assert.equal(occurrencesInMonth(r, '2026-04').length, 0)
})

test('weekly bills every 7 days within the month', () => {
  const r = { ...base, cycle: 'weekly', startDate: '2026-06-01' }
  const occ = occurrencesInMonth(r, '2026-06')
  assert.deepEqual(occ.map((o) => o.date),
    ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29'])
})

test('weekly started mid-previous-month lands on the right weekday', () => {
  const r = { ...base, cycle: 'weekly', startDate: '2026-05-20' }
  const occ = occurrencesInMonth(r, '2026-06')
  assert.deepEqual(occ.map((o) => o.date),
    ['2026-06-03', '2026-06-10', '2026-06-17', '2026-06-24'])
})

test('paused and archived produce no occurrences', () => {
  const r = { ...base, cycle: 'monthly', startDate: '2026-01-01' }
  assert.equal(occurrencesInMonth({ ...r, status: 'paused' }, '2026-06').length, 0)
  assert.equal(occurrencesInMonth({ ...r, status: 'archived' }, '2026-06').length, 0)
})

/* ---------------- occurrences across a date range (upcoming subs) ---------------- */

const SUBS = [
  { id: 's1', name: 'Gym', amountCents: 2999, cycle: 'monthly', startDate: '2026-01-01', status: 'active', categoryId: 'cat-health' },
  { id: 's2', name: 'Spotify', amountCents: 1099, cycle: 'monthly', startDate: '2026-01-03', status: 'active', categoryId: 'cat-subscriptions' },
  { id: 's3', name: 'Netflix', amountCents: 1599, cycle: 'monthly', startDate: '2026-01-15', status: 'active', categoryId: 'cat-subscriptions' },
  { id: 's4', name: 'PausedMag', amountCents: 500, cycle: 'monthly', startDate: '2026-01-12', status: 'paused', categoryId: 'cat-other' },
]

test('occurrencesInRange: next 7 days from 2026-06-11 catches only Netflix (15th)', () => {
  const out = occurrencesInRange(SUBS, '2026-06-11', '2026-06-18')
  assert.deepEqual(out.map((o) => o.name), ['Netflix'])
  assert.equal(out[0].date, '2026-06-15')
})

test('occurrencesInRange: spans a month boundary', () => {
  // 2026-06-11 .. 2026-07-11 → Netflix Jun15, Gym Jul1, Spotify Jul3
  const out = occurrencesInRange(SUBS, '2026-06-11', '2026-07-11')
  assert.deepEqual(out.map((o) => o.name), ['Netflix', 'Gym', 'Spotify'])
  // sorted ascending by date
  assert.deepEqual(out.map((o) => o.date), ['2026-06-15', '2026-07-01', '2026-07-03'])
})

test('occurrencesInRange: paused subs never appear', () => {
  const out = occurrencesInRange(SUBS, '2026-06-01', '2026-06-30')
  assert.ok(!out.some((o) => o.name === 'PausedMag'))
})

test('occurrencesInRange: bounds are inclusive', () => {
  const out = occurrencesInRange(SUBS, '2026-06-15', '2026-06-15')
  assert.deepEqual(out.map((o) => o.name), ['Netflix'])
})

test('occurrencesInRange: empty when nothing bills in the window', () => {
  assert.equal(occurrencesInRange(SUBS, '2026-06-16', '2026-06-30').length, 0)
})

/* ---------------- money parsing (EU formats) ---------------- */

test('parseToCents handles dot and comma decimals', () => {
  assert.equal(parseToCents('12.34'), 1234)
  assert.equal(parseToCents('12,34'), 1234)
  assert.equal(parseToCents('1.234,56'), 123456)
  assert.equal(parseToCents('1,234.56'), 123456)
  assert.equal(parseToCents('€ 15,99'), 1599)
  assert.equal(parseToCents('-12,50'), -1250)
  assert.equal(parseToCents('(12.50)'), -1250)
  assert.equal(parseToCents('garbage'), null)
})
