/**
 * Smart category suggestion — a transparent frequency map, no ML.
 *
 * The "learned merchant → category" map is derived from existing expenses:
 * every saved expense already records its note against a category, and
 * expenses are persisted to IndexedDB, so the model is durable, can't
 * desync from the data, and respects edits/deletes for free.
 *
 * Matching is three layers, tried strongest-first:
 *   1. exact   — normalized note seen before
 *   2. substring — a learned merchant contains (or is contained by) the note
 *   3. token   — word overlap between the note and learned merchants
 * Each layer tallies category frequency and returns the most common.
 */

/** lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(s) {
  const norm = normalizeText(s)
  return norm ? norm.split(' ').filter((t) => t.length >= 2) : []
}

/**
 * Build the suggestion model from a list of expenses (each {note, categoryId,
 * date}). Returns the aggregated structures suggestCategory() consumes.
 */
export function buildCategoryModel(expenses) {
  // norm string -> Map(categoryId -> count)
  const byNorm = new Map()
  // token -> Map(categoryId -> count)
  const byToken = new Map()

  const bump = (index, key, categoryId) => {
    if (!key || !categoryId) return
    let inner = index.get(key)
    if (!inner) index.set(key, (inner = new Map()))
    inner.set(categoryId, (inner.get(categoryId) ?? 0) + 1)
  }

  // Most recent category, for the "no note match" fallback.
  let lastCategoryId = null
  let lastDate = ''

  for (const e of expenses) {
    if (!e.categoryId) continue
    const norm = normalizeText(e.note)
    if (norm) {
      bump(byNorm, norm, e.categoryId)
      for (const tok of tokenize(e.note)) bump(byToken, tok, e.categoryId)
    }
    if (!lastDate || e.date >= lastDate) {
      lastDate = e.date
      lastCategoryId = e.categoryId
    }
  }

  return { byNorm, byToken, lastCategoryId }
}

/** argmax of a Map(categoryId -> count); null if empty. Deterministic ties. */
function topCategory(counts) {
  let best = null
  let bestCount = 0
  for (const [categoryId, count] of counts) {
    if (count > bestCount || (count === bestCount && (best === null || categoryId < best))) {
      best = categoryId
      bestCount = count
    }
  }
  return best
}

/** Merge category counts from `src` into `dst`, scaled by `weight`. */
function accumulate(dst, src, weight = 1) {
  for (const [categoryId, count] of src) {
    dst.set(categoryId, (dst.get(categoryId) ?? 0) + count * weight)
  }
}

/**
 * Suggest a categoryId for a raw note. Returns null when there's nothing to
 * go on (empty note or no learned overlap) — the caller decides the fallback.
 */
export function suggestCategory(model, note) {
  const norm = normalizeText(note)
  if (!norm) return null

  // 1. exact normalized match
  const exact = model.byNorm.get(norm)
  if (exact) return topCategory(exact)

  // 2. substring match against learned merchants
  const subCounts = new Map()
  for (const [learned, counts] of model.byNorm) {
    if (learned.includes(norm) || norm.includes(learned)) {
      accumulate(subCounts, counts)
    }
  }
  if (subCounts.size > 0) return topCategory(subCounts)

  // 3. token overlap
  const tokens = tokenize(note)
  if (tokens.length === 0) return null
  const tokCounts = new Map()
  for (const tok of tokens) {
    const counts = model.byToken.get(tok)
    if (counts) accumulate(tokCounts, counts)
  }
  return tokCounts.size > 0 ? topCategory(tokCounts) : null
}
