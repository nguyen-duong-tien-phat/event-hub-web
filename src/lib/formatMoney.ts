// The API and the mobile app both use US dollars with two decimals.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatMoney = (amount: number) => usd.format(amount)

// "$25.00 – $80.00" for a range, one price when they match, "Free" at 0 and "–" when the event has no tickets.
export function formatPriceRange(min: number | null, max: number | null) {
  if (min === null || max === null) return '–'
  if (max === 0) return 'Free'
  const from = min === 0 ? 'Free' : formatMoney(min)
  return min === max ? from : `${from} – ${formatMoney(max)}`
}
