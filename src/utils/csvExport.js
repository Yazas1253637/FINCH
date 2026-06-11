import Papa from 'papaparse'

/**
 * Export one-off expenses to CSV (date / amount / category / note).
 *
 * Amounts are written comma-decimal (EU/nl-NL, e.g. "12,99") so the file
 * round-trips cleanly back through the CSV importer's comma-aware parser.
 * Values are positive — on re-import choose "positive amounts are expenses".
 */

/** Pure: build the CSV string. Exported for unit testing. */
export function buildExpenseCSV(expenses, categories) {
  const nameOf = new Map(categories.map((c) => [c.id, c.name]))

  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      Date: e.date,
      Amount: (e.amountCents / 100).toFixed(2).replace('.', ','),
      Category: nameOf.get(e.categoryId) ?? 'Other',
      Note: e.note ?? '',
    }))

  return Papa.unparse(rows, {
    columns: ['Date', 'Amount', 'Category', 'Note'],
  })
}

/** Build the CSV and trigger a download. */
export function exportExpensesCSV(state) {
  const csv = buildExpenseCSV(state.expenses, state.categories)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finch-expenses-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return state.expenses.length
}
