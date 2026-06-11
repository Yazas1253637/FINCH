import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartTooltip, EmptyChart } from './ChartBits.jsx'
import { DynamicStereo } from '../ui/DotMatrix.jsx'

/**
 * Spend within the month: daily bars + cumulative line, with last month's
 * cumulative curve as a quiet dashed reference. All green-family.
 */
export function TrendCard({ cumulative, previousCumulative, monthShort, prevMonthShort }) {
  const hasData = cumulative.some((d) => d.dayCents > 0)
  if (!hasData) {
    return <EmptyChart note="Spending over time shows up once the month has expenses." />
  }

  const data = cumulative.map((d, i) => ({
    ...d,
    prevCumulativeCents: previousCumulative[i]?.cumulativeCents ?? null,
  }))

  return (
    <>
    <div className="mb-2 flex justify-end">
      <DynamicStereo />
    </div>
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="day"
            ticks={[1, 8, 15, 22, data.length]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
            className="dark:[&_text]:fill-snow-faint"
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={{ fill: 'var(--color-accent)', opacity: 0.07 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              const rows = [
                { label: `Day ${label}`, cents: p.dayCents, color: 'var(--color-accent)' },
                { label: `${monthShort} to date`, cents: p.cumulativeCents, color: 'var(--color-accent-deep)' },
              ]
              if (p.prevCumulativeCents != null) {
                rows.push({ label: `${prevMonthShort} to date`, cents: p.prevCumulativeCents, color: 'var(--color-ink-faint)' })
              }
              return <ChartTooltip rows={rows} />
            }}
          />
          <Bar
            dataKey="dayCents"
            fill="var(--color-accent)"
            opacity={0.32}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="prevCumulativeCents"
            stroke="var(--color-ink-faint)"
            strokeDasharray="4 4"
            strokeWidth={1.2}
            dot={false}
            animationDuration={700}
          />
          <Line
            type="monotone"
            dataKey="cumulativeCents"
            stroke="var(--color-accent)"
            strokeWidth={2.2}
            dot={false}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </>
  )
}
