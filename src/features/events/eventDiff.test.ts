import { expect, test } from 'vitest'
import type { EventDetail } from '@/api/events'
import { buildPatch, toFormValues } from './eventDiff'

const event: EventDetail = {
  id: 'e1',
  title: 'Midnight Echoes Live',
  description: 'Two sets.',
  startsAt: '2026-11-14T19:00:00.000Z',
  location: 'The Fillmore',
  imageUrl: 'http://storage.test/events/images/a.jpg',
  category: 'Concerts',
  highlights: ['Two live sets'],
  organizer: { id: 'u2', fullName: 'Minh Le' },
}

test('nothing changed: an empty patch, and startsAt is never re-sent', () => {
  expect(buildPatch(event, toFormValues(event))).toEqual({})
})

test('only the edited field goes into the patch', () => {
  const values = { ...toFormValues(event), title: 'New title' }
  expect(buildPatch(event, values)).toEqual({ title: 'New title' })
})

test('a changed start time is sent as UTC', () => {
  const values = { ...toFormValues(event), startsAt: '2026-12-01T20:15' }
  expect(buildPatch(event, values)).toEqual({ startsAt: new Date(2026, 11, 1, 20, 15).toISOString() })
})

test('highlights replace the whole list, blanks dropped, and [] clears it', () => {
  const edited = { ...toFormValues(event), highlights: [{ text: ' Doors at 6 ' }, { text: '' }] }
  expect(buildPatch(event, edited)).toEqual({ highlights: ['Doors at 6'] })
  expect(buildPatch(event, { ...toFormValues(event), highlights: [] })).toEqual({ highlights: [] })
})

test('a new poster sets imageUrl', () => {
  expect(buildPatch(event, toFormValues(event), 'http://storage.test/events/images/b.png')).toEqual({
    imageUrl: 'http://storage.test/events/images/b.png',
  })
})
