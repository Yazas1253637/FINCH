import { useMemo } from 'react'
import { useStore } from '../store/StoreProvider.jsx'
import { todayISO, addDays } from '../utils/dates.js'
import { occurrencesInRange } from '../utils/recurrence.js'

/**
 * Subscriptions billing soon. Uses occurrencesInRange (which is built on the
 * shared occurrencesInMonth) so billing dates match the rest of the app.
 * Only active subs produce occurrences — paused/archived are already excluded.
 */
export function useUpcomingSubscriptions() {
  const { state } = useStore()

  return useMemo(() => {
    const today = todayISO()
    const window = (days) => {
      const items = occurrencesInRange(state.recurring, today, addDays(today, days))
      const totalCents = items.reduce((acc, o) => acc + o.amountCents, 0)
      return { items, totalCents, count: items.length, days }
    }
    return { next7: window(7), next30: window(30) }
  }, [state.recurring])
}
