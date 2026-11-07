import { api } from './client'
import type { Paged } from './types'

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled'

// One person's way in. `code` goes into the QR, `shortCode` is what staff can type when the QR does not scan.
export interface Admission {
  id: string
  ticketType: string
  code: string
  shortCode: string
  checkedInAt: string | null // UTC
  checkedInBy: { id: string; fullName: string } | null
}

// Fields of the booking response that the dashboard reads (buyer is filled in the by-event list).
export interface Booking {
  id: string
  eventId: string
  tickets: { ticketId: string; type: string; quantity: number; unitPrice: number }[]
  quantity: number
  totalPrice: number // with the service fee
  status: BookingStatus
  createdAt: string // UTC
  event?: { id: string; title: string } // the booked event (the managed and by-event lists fill it)
  buyer?: { id: string; fullName: string; email: string }
  admissions: Admission[] // empty until Confirmed
  checkedInCount: number
  canCancel: boolean // false once cancelled or any ticket is checked in
}

// GET /bookings/{id}: an Admin or the event's Organizer may read it. The buyer is not loaded here (only in the by-event list).
export interface BookingDetail extends Booking {
  event?: { id: string; title: string; startsAt: string; location: string }
  subtotal: number
  serviceFee: number
  expiresAt: string // UTC; the hold on a Pending booking ends then
}

export const getBooking = (id: string) => api<BookingDetail>(`/bookings/${id}`)

export const listEventBookings = (eventId: string, page: number, pageSize: number) =>
  api<Paged<Booking>>(`/bookings/by-event/${eventId}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`)

// Bookings across events: all for an Admin, those of their own events for an Organizer; eventId and status narrow it.
export const listManagedBookings = ({ eventId, status, page, pageSize }: { eventId?: string; status?: BookingStatus; page: number; pageSize: number }) => {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (eventId) query.set('eventId', eventId)
  if (status) query.set('status', status)
  return api<Paged<Booking>>(`/bookings/managed?${query}`)
}

// A paid booking is refunded by the API.
export const cancelBooking = (id: string) => api<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' })
