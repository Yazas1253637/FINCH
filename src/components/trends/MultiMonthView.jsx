import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useMultiMonthData } from '../../hooks/useMultiMonthData.js'
import { useCategoryIndex } from '../../hooks/useMonthData.js'
import { formatCents, formatCentsWhole } from '../../utils/money.js'
import { Card, CardLabel } from '../layout/Card.jsx'
import { ChartTooltip, EmptyChart } from '../charts/ChartBits.jsx'

/**
 * Multi-month trends. Two charts:
 *   1. Total spend per month — green bars (the headline trend).
 *   2. Per-category over the window — SMALL MULTIPLES.
 *
 * Why small multiples over a stacked bar: the category palette is a set of
 * muted, closely-valued tones (several near-greens) that smear into an
 * unreadable stack. Small multiples give each category its own mini trend on
 * a shared Y-scale, so magnitudes stay comparable while each line reads
 * cleanly — and each tile is single-colored, honoring the tonal data-viz ramp.
 */
export function MultiMonthView() {
  const [monthsBack, setMonthsBack] = useState(6)
  const { months, categoryIds, windowTotal, avgPerMonth, truncated } = useMultiMonthData(monthsBack)
  const categoryOf = useCategoryIndex()

  const hasData = windowTotal > 0

  return (
    <main className="animate-rise grid grid-cols-1 gap-4 pt-1 md:grid-cols-6">
      <Card span="md:col-span-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <CardLabel className="mb-1">Monthly spend — last {months.length} month{months.length !== 1 && 's'}</CardLabel>
            <p className="figure-serif text-4xl">{formatCentsWhole(avgPerMonth)}</p>
            <p className="mt-1 text-sm text-ink-soft dark:text-snow-soft">
              average per month · {formatCentsWhole(windowTotal)} total
            </p>
          </div>
          <WindowToggle value={monthsBack} onChange={setMonthsBack} />
        </div>

        {!hasData ? (
          <EmptyChart note="Spend over time appears once you have a month or two of history." />
        ) : (
          <TotalBars months={months} />
        )}
        {truncated && hasData && (
          <p className="mt-3 text-xs text-ink-faint dark:text-snow-faint">
            Showing your full history ({months.length} month{months.length !== 1 && 's'}) — not enough data for {monthsBack} yet.
          </p>
        )}
      </Card>

      {hasData && categoryIds.length > 0 && (
        <Card span="md:col-span-6">
          <CardLabel>By category</CardLabel>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoryIds.map((id) => (
              <CategorySparkline
                key={id}
                category={categoryOf(id)}
                months={months}
                globalMax={Math.max(...months.flatMap((m) => [...m.byCategory.values()]), 1)}
              />
            ))}
          </div>
        </Card>
      )}
    </main>
  )
}

function WindowToggle({ value, onChange }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-full bg-line/50 p-1 dark:bg-night-line/50">
      {[6, 12].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all
            ${value === n
              ? 'bg-paper-raised shadow-card dark:bg-night-raised dark:shadow-card-dark'
              : 'text-ink-soft hover:text-ink dark:text-snow-soft dark:hover:text-snow'}`}
        >
          {n}m
        </button>
      ))}
    </div>
  )
}

function TotalBars({ months }) {
  const data = months.map((m) => ({ short: m.short, monthKey: m.monthKey, totalCents: m.totalCents }))
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="short"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
            className="dark:[&_text]:fill-snow-faint"
            interval={data.length > 8 ? 1 : 0}
          />
          <YAxis hide domain={[0, (max) => Math.ceil(max * 1.12)]} />
          <Tooltip
            cursor={{ fill: 'var(--color-accent)', opacity: 0.07 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return <ChartTooltip rows={[{ label: p.short, cents: p.totalCents, color: 'var(--color-accent)' }]} />
            }}
          />
          {/* Recharts bar animation is unreliable under StrictMode (same as the
              donut); the card's animate-rise covers the entrance instead. */}
          <Bar dataKey="totalCents" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.monthKey} fill="var(--color-accent)" opacity={i === data.length - 1 ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** One small multiple: a mono-color area sparkline on a shared Y scale. */
function CategorySparkline({ category, months, globalMax }) {
  const values = months.map((m) => m.byCategory.get(category.id) ?? 0)
  const total = values.reduce((a, b) => a + b, 0)
  const latest = values[values.length - 1] ?? 0
  const avgPerMonth = months.length ? Math.round(total / months.length) : 0

  const W = 100
  const H = 30
  const n = values.length
  const x = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v) => H - (v / globalMax) * (H - 2) - 1
  const linePts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const areaPts = `0,${H} ${linePts} ${W},${H}`

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: category.color }} />
          <span className="truncate text-sm text-ink-soft dark:text-snow-soft">{category.name}</span>
        </span>
        <span className="tnum shrink-0 text-sm font-medium">{formatCents(total)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1.5 h-9 w-full overflow-visible">
        <polygon points={areaPts} fill={category.color} opacity="0.12" />
        <polyline
          points={linePts}
          fill="none"
          stroke={category.color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {n >= 1 && (
          <circle cx={x(n - 1)} cy={y(latest)} r="2" fill={category.color} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <p className="tnum mt-0.5 text-xs text-ink-faint dark:text-snow-faint">
        {formatCentsWhole(avgPerMonth)}/mo avg · {n} mo
      </p>
    </div>
  )
}
