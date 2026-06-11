import { useState } from 'react'
import { useStore, newId } from '../../store/StoreProvider.jsx'
import { useCategoryIndex } from '../../hooks/useMonthData.js'
import { goalProgress } from '../../utils/goals.js'
import { formatCents, parseToCents } from '../../utils/money.js'
import { todayISO } from '../../utils/dates.js'
import { Sheet, Field, inputClass, PrimaryButton, GhostButton } from '../ui/Sheet.jsx'

const TONE_BAR = {
  ok: 'bg-ok dark:bg-ok-bright',
  warn: 'bg-warn',
  over: 'bg-over dark:bg-over-bright',
}
const TONE_TEXT = {
  ok: 'text-ok dark:text-ok-bright',
  warn: 'text-warn',
  over: 'text-over dark:text-over-bright',
}
const TONE_LABEL = { ok: 'On track', warn: 'Caution', over: 'Over budget' }

/** Budget goals with color-coded progress for the viewed month. */
export function GoalsCard({ monthKey }) {
  const { state } = useStore()
  const categoryOf = useCategoryIndex()
  const [editing, setEditing] = useState(null) // goal | 'new'

  return (
    <>
      {state.goals.length === 0 ? (
        <button
          onClick={() => setEditing('new')}
          className="grid h-32 w-full place-items-center rounded-xl border border-dashed border-line
            text-sm text-ink-faint transition-colors hover:border-accent hover:text-accent-deep
            dark:border-night-line dark:text-snow-faint dark:hover:border-accent dark:hover:text-accent-bright"
        >
          Set a spending goal →
        </button>
      ) : (
        <ul className="space-y-5">
          {state.goals.map((g) => {
            const p = goalProgress(state, g, monthKey)
            const name = g.scope === 'overall' ? 'All spending' : categoryOf(g.scope).name
            const periodLabel = g.period === 'custom' ? `${g.from} → ${g.to}` : g.period
            return (
              <li key={g.id}>
                <button onClick={() => setEditing(g)} className="group w-full text-left">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm transition-colors group-hover:text-accent-deep dark:group-hover:text-accent-bright">
                      {name} <span className="text-xs text-ink-faint dark:text-snow-faint">· {periodLabel}</span>
                    </p>
                    <p className={`shrink-0 text-xs font-semibold ${TONE_TEXT[p.tone]}`}>
                      {TONE_LABEL[p.tone]} · <span className="tnum">{Math.round(p.pct)}%</span>
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/80 dark:bg-night-line">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${TONE_BAR[p.tone]}`}
                      style={{ width: `${Math.min(100, p.pct)}%` }}
                    />
                  </div>
                  <p className="tnum mt-1.5 text-xs text-ink-soft dark:text-snow-soft">
                    {formatCents(p.spentCents)} spent of {formatCents(g.amountCents)}
                    {' · '}{formatCents(p.remainingCents)} remaining
                  </p>
                </button>
              </li>
            )
          })}
          <li>
            <button
              onClick={() => setEditing('new')}
              className="w-full rounded-full py-1.5 text-xs font-medium text-accent-deep transition-colors
                hover:bg-accent-wash dark:text-accent-bright dark:hover:bg-accent-wash-dark"
            >
              + New goal
            </button>
          </li>
        </ul>
      )}

      {editing && (
        <GoalSheet goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function GoalSheet({ goal, onClose }) {
  const { state, actions } = useStore()
  const [scope, setScope] = useState(goal?.scope ?? 'overall')
  const [period, setPeriod] = useState(goal?.period ?? 'monthly')
  const [amount, setAmount] = useState(goal ? (goal.amountCents / 100).toFixed(2).replace('.', ',') : '')
  const [from, setFrom] = useState(goal?.from ?? todayISO())
  const [to, setTo] = useState(goal?.to ?? todayISO())

  const cents = parseToCents(amount)
  const valid = cents !== null && cents > 0 && (period !== 'custom' || from <= to)

  const save = () => {
    if (!valid) return
    actions.upsert('goal', {
      id: goal?.id ?? newId(),
      scope,
      period,
      amountCents: cents,
      ...(period === 'custom' ? { from, to } : {}),
    })
    onClose()
  }

  const remove = () => {
    if (!window.confirm('Delete this goal?')) return
    actions.remove('goal', goal.id)
    onClose()
  }

  const segment = (value, current, set, label) => (
    <button
      key={value}
      type="button"
      onClick={() => set(value)}
      className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors
        ${current === value
          ? 'bg-ink font-medium text-paper dark:bg-snow dark:text-night'
          : 'text-ink-soft hover:bg-accent-wash dark:text-snow-soft dark:hover:bg-accent-wash-dark'}`}
    >
      {label}
    </button>
  )

  return (
    <Sheet open onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="flex flex-col gap-4">
        <Field label="Budget (€)">
          <input className={`${inputClass} figure-serif text-2xl`} inputMode="decimal" placeholder="0,00"
            value={amount} autoFocus onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <Field label="Applies to">
          <div className="flex flex-wrap gap-1.5">
            {segment('overall', scope, setScope, 'All spending')}
            {state.categories.map((c) => segment(c.id, scope, setScope, c.name))}
          </div>
        </Field>

        <Field label="Period">
          <div className="flex flex-wrap gap-1.5">
            {segment('monthly', period, setPeriod, 'Monthly')}
            {segment('weekly', period, setPeriod, 'Weekly')}
            {segment('custom', period, setPeriod, 'Custom range')}
          </div>
        </Field>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <PrimaryButton onClick={save} disabled={!valid}>
            {goal ? 'Save changes' : 'Set goal'}
          </PrimaryButton>
          {goal && <GhostButton danger onClick={remove}>Delete goal</GhostButton>}
        </div>
      </div>
    </Sheet>
  )
}
