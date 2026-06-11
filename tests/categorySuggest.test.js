import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeText,
  tokenize,
  buildCategoryModel,
  suggestCategory,
} from '../src/utils/categorySuggest.js'

/* ---------------- normalization ---------------- */

test('normalizeText lowercases, strips punctuation, collapses spaces', () => {
  assert.equal(normalizeText('  Albert Heijn!! '), 'albert heijn')
  assert.equal(normalizeText('NS-Reizigers (top-up)'), 'ns reizigers top up')
  assert.equal(normalizeText(null), '')
  assert.equal(normalizeText(undefined), '')
})

test('tokenize drops 1-char noise tokens', () => {
  assert.deepEqual(tokenize('a Albert Heijn'), ['albert', 'heijn'])
})

/* ---------------- model + exact match ---------------- */

const EXPENSES = [
  { note: 'Albert Heijn', categoryId: 'cat-groceries', date: '2026-06-01' },
  { note: 'Albert Heijn weekly shop', categoryId: 'cat-groceries', date: '2026-06-08' },
  { note: 'NS train top-up', categoryId: 'cat-transport', date: '2026-06-05' },
  { note: 'Netflix', categoryId: 'cat-subscriptions', date: '2026-06-15' },
]

test('exact normalized note returns the learned category', () => {
  const model = buildCategoryModel(EXPENSES)
  assert.equal(suggestCategory(model, 'albert heijn'), 'cat-groceries')
  assert.equal(suggestCategory(model, '  ALBERT  HEIJN '), 'cat-groceries')
  assert.equal(suggestCategory(model, 'Netflix'), 'cat-subscriptions')
})

test('empty / whitespace note returns null (caller falls back)', () => {
  const model = buildCategoryModel(EXPENSES)
  assert.equal(suggestCategory(model, ''), null)
  assert.equal(suggestCategory(model, '   '), null)
})

test('unseen note with no overlap returns null', () => {
  const model = buildCategoryModel(EXPENSES)
  assert.equal(suggestCategory(model, 'completely new merchant xyz'), null)
})

/* ---------------- substring match ---------------- */

test('substring: typing a prefix of a learned merchant matches it', () => {
  const model = buildCategoryModel(EXPENSES)
  // "albert" is contained by "albert heijn" / "albert heijn weekly shop"
  assert.equal(suggestCategory(model, 'Albert'), 'cat-groceries')
})

test('substring: a longer note containing a learned merchant matches', () => {
  const model = buildCategoryModel(EXPENSES)
  assert.equal(suggestCategory(model, 'Netflix monthly subscription'), 'cat-subscriptions')
})

/* ---------------- token overlap ---------------- */

test('token overlap matches when no exact/substring hit', () => {
  const model = buildCategoryModel(EXPENSES)
  // "train" only appears in the transport note; no substring of full norms
  assert.equal(suggestCategory(model, 'monthly train pass'), 'cat-transport')
})

/* ---------------- frequency wins ---------------- */

test('most frequent category wins on conflicting history', () => {
  const model = buildCategoryModel([
    { note: 'Bistro', categoryId: 'cat-dining', date: '2026-06-01' },
    { note: 'Bistro', categoryId: 'cat-dining', date: '2026-06-02' },
    { note: 'Bistro', categoryId: 'cat-other', date: '2026-06-03' },
  ])
  assert.equal(suggestCategory(model, 'Bistro'), 'cat-dining')
})

/* ---------------- last-used fallback ---------------- */

test('buildCategoryModel tracks the most recent category by date', () => {
  const model = buildCategoryModel(EXPENSES)
  assert.equal(model.lastCategoryId, 'cat-subscriptions') // Netflix, 2026-06-15
})

test('expenses without a category are ignored', () => {
  const model = buildCategoryModel([
    { note: 'Mystery', categoryId: null, date: '2026-06-20' },
    { note: 'Coffee', categoryId: 'cat-dining', date: '2026-06-19' },
  ])
  assert.equal(model.lastCategoryId, 'cat-dining')
  assert.equal(suggestCategory(model, 'Mystery'), null)
})
