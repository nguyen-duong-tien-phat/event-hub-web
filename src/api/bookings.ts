import { api } from './client'
import type { Paged } from './types'

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled'

// Fields of the booking response that the dashboard reads (buyer is filled in the by-event list).
export interface Booking {
  id: string
  eventId: string
  tickets: { ticketId: string; type: string; quantity: number; unitPrice: number }[]
  quantity: number
  totalPrice: number // with the service fee
  status: BookingStatus
  createdAt: string // UTC
  buyer?: { id: string; fullName: string; email: string }
}

export const listEventBookings = (eventId: string, page: number, pageSize: number) =>
  api<Paged<Booking>>(`/bookings/by-event/${eventId}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`)

// A paid booking is refunded by the API.
export const cancelBooking = (id: string) => api<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' })
