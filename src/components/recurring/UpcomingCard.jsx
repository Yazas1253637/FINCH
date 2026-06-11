import { useUpcomingSubscriptions } from '../../hooks/useUpcomingSubscriptions.js'
import { useCategoryIndex } from '../../hooks/useMonthData.js'
import { formatCents, formatCentsWhole } from '../../utils/money.js'
import { todayISO } from '../../utils/dates.js'
import { Card, CardLabel } from '../layout/Card.jsx'

const dayMonth = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })

function relativeLabel(dateISO) {
  const today = todayISO()
  if (dateISO === today) return 'today'
  const a = new Date(today)
  const b = new Date(dateISO)
  const diff = Math.round((b - a) / 86400000)
  if (diff === 1) return 'tomorrow'
  return `in ${diff} days`
}

function formatDay(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number)
  return dayMonth.format(new Date(y, m - 1, d))
}

/**
 * Calm heads-up on subscriptions billing soon. Leads with the next 7 days,
 * with the 30-day total as quiet context. Hidden entirely when nothing is
 * due in the next 30 days — no empty noise.
 */
export function UpcomingCard({ span = 'md:col-span-6' }) {
  const { next7, next30 } = useUpcomingSubscriptions()
  const categoryOf = useCategoryIndex()

  if (next30.count === 0) return null

  const hasSoon = next7.count > 0
  const lead = hasSoon ? next7 : next30

  return (
    <Card span={span}>
      <CardLabel>Coming up</CardLabel>
      <p className="text-sm text-ink-soft dark:text-snow-soft">
        <span className="figure-serif text-2xl text-ink dark:text-snow">{formatCentsWhole(lead.totalCents)}</span>
        {' '}across {lead.count} subscription{lead.count !== 1 && 's'} due in the next {lead.days} days
      </p>

      <ul className="mt-4 divide-y divide-line/70 dark:divide-night-line/70">
        {lead.items.map((o) => {
          const cat = o.categoryId ? categoryOf(o.categoryId) : null
          return (
            <li key={`${o.recurringId}@${o.date}`} className="flex items-center gap-3 py-2.5 first:pt-0">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat?.color ?? 'var(--color-ink-faint)' }} />
              <span className="min-w-0 flex-1 truncate text-sm">{o.name}</span>
              <span className="tnum shrink-0 text-xs text-ink-faint dark:text-snow-faint">
                {formatDay(o.date)} · {relativeLabel(o.date)}
              </span>
              <span className="tnum w-16 shrink-0 text-right text-sm font-medium">{formatCents(o.amountCents)}</span>
            </li>
          )
        })}
      </ul>

      {hasSoon && next30.count > next7.count && (
        <p className="mt-3 text-xs text-ink-faint dark:text-snow-faint">
          {formatCentsWhole(next30.totalCents)} across {next30.count} due within 30 days.
        </p>
      )}
    </Card>
  )
}
