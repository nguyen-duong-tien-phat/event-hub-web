import { expect, test } from 'vitest'
import { fromLocalInput, toLocalInput } from './dates'

test('a datetime-local value is read in the browser time zone and sent as UTC', () => {
  expect(fromLocalInput('2026-11-14T19:00')).toBe(new Date(2026, 10, 14, 19, 0).toISOString())
})

test('an API time round-trips through the input without moving', () => {
  const iso = '2026-11-14T19:30:00.000Z'
  expect(fromLocalInput(toLocalInput(iso))).toBe(iso)
})
