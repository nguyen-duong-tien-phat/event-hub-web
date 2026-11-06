import { expect, test } from 'vitest'
import { formatPriceRange } from './formatMoney'

test.each([
  [25, 80, '$25.00 – $80.00'],
  [25, 25, '$25.00'],
  [0, 0, 'Free'],
  [0, 40, 'Free – $40.00'],
  [null, null, '–'],
])('formatPriceRange(%s, %s) is %s', (min, max, expected) => {
  expect(formatPriceRange(min, max)).toBe(expected)
})
