import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCents, formatCentsWhole } from '../../utils/money.js'
import { useCategoryIndex } from '../../hooks/useMonthData.js'
import { ChartTooltip, EmptyChart } from './ChartBits.jsx'
import { PixelGlyph } from '../ui/PixelGlyph.jsx'

/** Category split for the month — tonal green donut + ranked legend. */
export function DonutCard({ byCategory, totalCents }) {
  const categoryOf = useCategoryIndex()

  const data = [...byCategory.entries()]
    .map(([categoryId, cents]) => {
      const cat = categoryOf(categoryId)
      return { name: cat.name, value: cents, color: cat.color, icon: cat.icon }
    })
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return <EmptyChart note="Add an expense and the breakdown appears here." />
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
      {/* CSS entrance instead of Recharts' Pie animation (broken under StrictMode) */}
      <div className="animate-donut relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length
                  ? <ChartTooltip rows={[{ label: payload[0].name, cents: payload[0].value, color: payload[0].payload.color }]} />
                  : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="figure-serif text-lg">{formatCentsWhole(totalCents)}</p>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {data.slice(0, 6).map((d) => (
          <li key={d.name} className="flex items-baseline gap-2 text-sm">
            <PixelGlyph name={d.icon} color={d.color} className="h-3.5 w-3.5 self-center" />
            <span className="truncate text-ink-soft dark:text-snow-soft">{d.name}</span>
            <span className="mx-1 flex-1 border-b border-dotted border-line dark:border-night-line" />
            <span className="tnum shrink-0 font-medium">{formatCents(d.value)}</span>
            <span className="tnum w-10 shrink-0 text-right text-xs text-ink-faint dark:text-snow-faint">
              {Math.round((d.value / totalCents) * 100)}%
            </span>
          </li>
        ))}
        {data.length > 6 && (
          <li className="pt-1 text-xs text-ink-faint dark:text-snow-faint">
            + {data.length - 6} more in tooltip
          </li>
        )}
      </ul>
    </div>
  )
}
