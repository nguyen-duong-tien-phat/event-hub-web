export type StockTone = 'ok' | 'low' | 'none'

// What the Tickets column says about an event, from the sums the API sends with each list item.
export function stockStatus(total: number, remaining: number): { label: string; tone: StockTone } {
  if (total === 0) return { label: 'No tickets', tone: 'none' }
  if (remaining === 0) return { label: 'Sold out', tone: 'none' }
  if (remaining <= 10 || remaining / total <= 0.1) return { label: 'Few left', tone: 'low' }
  return { label: 'On sale', tone: 'ok' }
}

export const stockBadgeClass: Record<StockTone, string> = {
  ok: 'bg-success-soft text-success',
  low: 'bg-warning-soft text-warning',
  none: 'bg-secondary text-secondary-foreground',
}
