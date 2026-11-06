import { expect, test } from 'vitest'
import { stockStatus } from './stock'

test.each([
  [0, 0, 'No tickets'],
  [300, 0, 'Sold out'],
  [300, 24, 'Few left'], // 8% left
  [20, 6, 'Few left'], // 10 seats or fewer
  [200, 180, 'On sale'],
])('%i seats, %i left: %s', (total, remaining, label) => {
  expect(stockStatus(total, remaining).label).toBe(label)
})
