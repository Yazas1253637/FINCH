import { useState } from 'react'
import { formatCents } from '../../utils/money.js'
import { useCategoryIndex } from '../../hooks/useMonthData.js'
import { useStore } from '../../store/StoreProvider.jsx'

/**
 * Entry list with multi-select. One-off expenses: tap to edit, selected
 * ones are deleted outright. Recurring charges (↻) are selectable too —
 * deleting one archives the underlying subscription (history preserved,
 * restorable from the Subscriptions tab).
 */
export function ExpenseList({ entries, onEdit, emptyNote }) {
  const categoryOf = useCategoryIndex()
  const { state, actions } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirming, setConfirming] = useState(false)

  const visible = expanded || selecting ? entries : entries.slice(0, 8)
  const allChosen = entries.length > 0 && selected.size === entries.length

  const chosen = entries.filter((e) => selected.has(e.id))
  const chosenSubs = new Set(chosen.filter((e) => e.recurringId).map((e) => e.recurringId))

  const exitSelectMode = () => {
    setSelecting(false)
    setSelected(new Set())
    setConfirming(false)
  }

  const toggle = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    setConfirming(false)
  }

  const toggleAll = () => {
    setSelected(allChosen ? new Set() : new Set(entries.map((e) => e.id)))
    setConfirming(false)
  }

  const deleteSelected = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    const expenseIds = chosen.filter((e) => !e.recurringId).map((e) => e.id)
    if (expenseIds.length > 0) actions.removeMany('expense', expenseIds)
    for (const rid of chosenSubs) {
      const sub = state.recurring.find((r) => r.id === rid)
      if (sub) actions.upsert('recurring', { ...sub, status: 'archived' })
    }
    exitSelectMode()
  }

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint dark:text-snow-faint">
        {emptyNote ?? 'Nothing spent this month — or nothing written down yet.'}
      </p>
    )
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-end gap-3">
        {selecting && (
          <button
            onClick={toggleAll}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-accent-deep
              dark:text-snow-soft dark:hover:text-accent-bright"
          >
            {allChosen ? 'Select none' : `Select all ${entries.length}`}
          </button>
        )}
        <button
          onClick={() => (selecting ? exitSelectMode() : setSelecting(true))}
          className="text-xs font-medium text-accent-deep transition-colors hover:text-accent
            dark:text-accent-bright"
        >
          {selecting ? 'Cancel' : 'Select'}
        </button>
      </div>

      <ul className="divide-y divide-line/70 dark:divide-night-line/70">
        {visible.map((e) => {
          const cat = categoryOf(e.categoryId)
          const isRecurring = Boolean(e.recurringId)
          const isChosen = selected.has(e.id)
          return (
            <li key={e.id}>
              <button
                className={`group flex w-full items-center gap-3 py-3 text-left first:pt-0
                  ${isRecurring && !selecting ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={() => {
                  if (selecting) toggle(e.id)
                  else if (!isRecurring) onEdit(e)
                }}
                title={
                  isRecurring
                    ? selecting
                      ? 'Deleting archives this subscription'
                      : 'Recurring charge — manage in Subscriptions'
                    : selecting ? undefined : 'Edit'
                }
              >
                {selecting && (
                  <span
                    aria-hidden
                    className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-colors
                      ${isChosen
                        ? 'border-accent bg-accent text-white'
                        : 'border-line bg-paper-raised dark:border-night-line dark:bg-night-raised'}`}
                  >
                    {isChosen && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                )}
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${!isRecurring && !selecting && 'group-hover:text-accent-deep dark:group-hover:text-accent-bright'} transition-colors`}>
                    {e.note || cat.name}
                    {isRecurring && (
                      <svg viewBox="0 0 24 24" className="ml-1.5 inline h-3 w-3 -translate-y-px text-ink-faint dark:text-snow-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2M18.5 2v4h-4M5.5 22v-4h4" />
                      </svg>
                    )}
                  </span>
                  <span className="tnum mt-0.5 block text-xs text-ink-faint dark:text-snow-faint">
                    {e.date} · {cat.name}
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-medium">{formatCents(e.amountCents)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {!selecting && entries.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full rounded-full py-2 text-center text-xs font-medium text-accent-deep
            transition-colors hover:bg-accent-wash dark:text-accent-bright dark:hover:bg-accent-wash-dark"
        >
          {expanded ? 'Show fewer' : `Show all ${entries.length}`}
        </button>
      )}

      {selecting && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 dark:border-night-line">
          <p className="text-xs text-ink-soft dark:text-snow-soft">
            <span className="tnum">{selected.size} selected</span>
            {chosenSubs.size > 0 && (
              <span className="block text-ink-faint dark:text-snow-faint">
                {chosenSubs.size} subscription{chosenSubs.size !== 1 && 's'} will be archived, not deleted
              </span>
            )}
          </p>
          <button
            onClick={deleteSelected}
            disabled={selected.size === 0}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors
              ${selected.size === 0
                ? 'cursor-not-allowed bg-line text-ink-faint dark:bg-night-line dark:text-snow-faint'
                : 'bg-over text-white hover:bg-over/90'}`}
          >
            {confirming
              ? `Really delete ${selected.size}?`
              : `Delete${selected.size > 0 ? ` ${selected.size}` : ''}`}
          </button>
        </div>
      )}
    </>
  )
}
