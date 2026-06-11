import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ratingOf,
  goalWindow,
  spendInRange,
  goalProgress,
  weekStartISO,
  addDaysISO,
} from '../src/utils/goals.js'

/* ---------------- rating thresholds: green <70 / amber 70–100 / red >100 ---------------- */

test('ratingOf: tone buckets', () => {
  assert.equal(ratingOf(0, 10000).tone, 'ok')
  assert.equal(ratingOf(5000, 10000).tone, 'ok')      // 50%
  assert.equal(ratingOf(8000, 10000).tone, 'warn')    // 80%
  assert.equal(ratingOf(15000, 10000).tone, 'over')   // 150%
})

test('ratingOf: exact boundary values', () => {
  // 69.9% → ok (strictly under 70)
  assert.equal(ratingOf(6990, 10000).tone, 'ok')
  assert.equal(Math.round(ratingOf(6990, 10000).pct * 10) / 10, 69.9)
  // 70.0% → warn (70 is not < 70)
  assert.equal(ratingOf(7000, 10000).tone, 'warn')
  assert.equal(ratingOf(7000, 10000).pct, 70)
  // 100.0% → warn (<= 100 is caution, not over)
  assert.equal(ratingOf(10000, 10000).tone, 'warn')
  assert.equal(ratingOf(10000, 10000).pct, 100)
  // 100.1% → over
  assert.equal(ratingOf(10010, 10000).tone, 'over')
  assert.equal(Math.round(ratingOf(10010, 10000).pct * 10) / 10, 100.1)
})

test('ratingOf: zero budget does not divide by zero', () => {
  const r = ratingOf(500, 0)
  assert.equal(r.pct, 0)
  assert.equal(r.tone, 'ok')
})

/* ---------------- period windows: monthly / weekly / custom ---------------- */

test('goalWindow monthly spans the whole viewed month (incl. leap Feb)', () => {
  assert.deepEqual(goalWindow({ period: 'monthly' }, '2026-06'), { from: '2026-06-01', to: '2026-06-30' })
  assert.deepEqual(goalWindow({ period: 'monthly' }, '2026-02'), { from: '2026-02-01', to: '2026-02-28' })
  assert.deepEqual(goalWindow({ period: 'monthly' }, '2028-02'), { from: '2028-02-01', to: '2028-02-29' })
})

test('goalWindow weekly is a Mon–Sun 7-day span', () => {
  const w = goalWindow({ period: 'weekly' }, '2026-06')
  assert.equal(addDaysISO(w.from, 6), w.to)
  // from is a Monday
  const [y, m, d] = w.from.split('-').map(Number)
  assert.equal((new Date(y, m - 1, d).getDay() + 6) % 7, 0)
})

test('goalWindow custom passes the goal dates through verbatim', () => {
  const g = { period: 'custom', from: '2026-06-10', to: '2026-06-20' }
  assert.deepEqual(goalWindow(g, '2026-06'), { from: '2026-06-10', to: '2026-06-20' })
})

test('weekStartISO returns the Monday for a known mid-week date', () => {
  // 2026-06-11 is a Thursday → Monday is 2026-06-08
  assert.equal(weekStartISO(new Date(2026, 5, 11)), '2026-06-08')
})

/* ---------------- spend in range: overall vs per-category, incl. recurring ---------------- */

const STATE = {
  expenses: [
    { id: 'e1', date: '2026-06-02', amountCents: 5000, categoryId: 'cat-groceries' },
    { id: 'e2', date: '2026-06-05', amountCents: 2000, categoryId: 'cat-dining' },
    { id: 'e3', date: '2026-06-25', amountCents: 3000, categoryId: 'cat-groceries' },
    { id: 'e4', date: '2026-05-30', amountCents: 9999, categoryId: 'cat-groceries' }, // outside June
  ],
  recurring: [
    // €15.99 monthly, billed on the 15th, active → one charge in June
    { id: 'r1', name: 'Netflix', amountCents: 1599, cycle: 'monthly', startDate: '2026-01-15', categoryId: 'cat-subscriptions', status: 'active' },
    { id: 'r2', name: 'PausedGym', amountCents: 3000, cycle: 'monthly', startDate: '2026-01-01', categoryId: 'cat-health', status: 'paused' },
  ],
}

test('spendInRange overall includes one-off + active recurring inside the window', () => {
  // June: 5000 + 2000 + 3000 + 1599 (Netflix) = 11599; paused gym excluded; May excluded
  assert.equal(spendInRange(STATE, '2026-06-01', '2026-06-30', 'overall'), 11599)
})

test('spendInRange per-category only counts that category', () => {
  assert.equal(spendInRange(STATE, '2026-06-01', '2026-06-30', 'cat-groceries'), 8000)
  assert.equal(spendInRange(STATE, '2026-06-01', '2026-06-30', 'cat-subscriptions'), 1599)
  assert.equal(spendInRange(STATE, '2026-06-01', '2026-06-30', 'cat-dining'), 2000)
})

test('spendInRange respects the [from,to] bounds inclusively', () => {
  // narrow window catching only e2 (the 5th)
  assert.equal(spendInRange(STATE, '2026-06-05', '2026-06-05', 'overall'), 2000)
})

/* ---------------- goalProgress: full assembly ---------------- */

test('goalProgress: overall monthly goal computes spent/remaining/tone', () => {
  const goal = { id: 'g1', scope: 'overall', period: 'monthly', amountCents: 20000 }
  const p = goalProgress(STATE, goal, '2026-06')
  assert.equal(p.spentCents, 11599)
  assert.equal(p.remainingCents, 8401)
  assert.equal(p.tone, 'ok') // 11599/20000 = 58%
})

test('goalProgress tone tracks the spend/budget ratio', () => {
  // budget 20000, spent 11599 = 58% → ok
  assert.equal(goalProgress(STATE, { scope: 'overall', period: 'monthly', amountCents: 20000 }, '2026-06').tone, 'ok')
  // budget 15000, spent 11599 = 77.3% → warn
  assert.equal(goalProgress(STATE, { scope: 'overall', period: 'monthly', amountCents: 15000 }, '2026-06').tone, 'warn')
  // budget 10000, spent 11599 = 116% → over
  assert.equal(goalProgress(STATE, { scope: 'overall', period: 'monthly', amountCents: 10000 }, '2026-06').tone, 'over')
})

test('goalProgress: per-category goal only sees its category', () => {
  const goal = { scope: 'cat-groceries', period: 'monthly', amountCents: 10000 }
  const p = goalProgress(STATE, goal, '2026-06')
  assert.equal(p.spentCents, 8000) // not the 9999 May groceries row
  assert.equal(p.remainingCents, 2000)
  assert.equal(p.tone, 'warn') // 80%
})

test('goalProgress: remaining never goes negative when over budget', () => {
  const goal = { scope: 'cat-groceries', period: 'monthly', amountCents: 5000 }
  const p = goalProgress(STATE, goal, '2026-06')
  assert.equal(p.spentCents, 8000)
  assert.equal(p.remainingCents, 0)
  assert.equal(p.tone, 'over')
})

test('goalProgress: custom-range goal uses its own dates, ignoring monthKey', () => {
  const goal = { scope: 'overall', period: 'custom', from: '2026-06-01', to: '2026-06-10', amountCents: 10000 }
  // window catches e1 (5000) + e2 (2000) only = 7000; Netflix bills the 15th (outside)
  const p = goalProgress(STATE, goal, '2026-01') // monthKey deliberately wrong
  assert.equal(p.spentCents, 7000)
})
