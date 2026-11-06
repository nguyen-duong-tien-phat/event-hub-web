import type { EventDetail, EventPatch } from '@/api/events'
import { fromLocalInput, toLocalInput } from '@/lib/dates'

export interface EventFormValues {
  title: string
  category: string
  location: string
  startsAt: string // <input type="datetime-local"> value
  description: string
  highlights: { text: string }[]
}

export const toFormValues = (e: EventDetail): EventFormValues => ({
  title: e.title,
  category: e.category,
  location: e.location,
  startsAt: toLocalInput(e.startsAt),
  description: e.description,
  highlights: e.highlights.map((text) => ({ text })),
})

export const cleanHighlights = (items: { text: string }[]) => items.map((h) => h.text.trim()).filter(Boolean)

/**
 * PATCH body with only what changed. startsAt must be a day ahead, so an unchanged one is never sent
 * (an event that starts tomorrow would otherwise fail on a title edit); highlights replaces the whole list.
 */
export function buildPatch(original: EventDetail, v: EventFormValues, imageUrl?: string): EventPatch {
  const patch: EventPatch = {}
  if (v.title !== original.title) patch.title = v.title
  if (v.category !== original.category) patch.category = v.category
  if (v.location !== original.location) patch.location = v.location
  if (v.description !== original.description) patch.description = v.description
  if (v.startsAt !== toLocalInput(original.startsAt)) patch.startsAt = fromLocalInput(v.startsAt)
  const highlights = cleanHighlights(v.highlights)
  if (JSON.stringify(highlights) !== JSON.stringify(original.highlights)) patch.highlights = highlights
  if (imageUrl) patch.imageUrl = imageUrl
  return patch
}
