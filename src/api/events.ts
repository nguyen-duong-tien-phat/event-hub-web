import { api } from './client'
import type { Paged } from './types'

// Only the fields the user detail page reads; the rest of the DTOs is in EventHub.Core/Events.
export interface EventListItem {
  id: string
  title: string
  startsAt: string // UTC
}

export interface EventStats {
  eventId: string
  ticketRevenue: number // without the service fee
  ticketsSold: number // confirmed bookings only
  checkedIn: number
  tickets: { totalQuantity: number; remainingQuantity: number }[]
}

// shortcut: first 100 events only (the API's page size limit), page through if an organizer ever has more.
export const listEventsByOrganizer = (organizerId: string) =>
  api<Paged<EventListItem>>(`/events?${new URLSearchParams({ organizerId, pageSize: '100', sort: 'StartsAtDesc' })}`)

export const getEventStats = (id: string) => api<EventStats>(`/events/${id}/stats`)
