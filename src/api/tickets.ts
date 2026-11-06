import { api } from './client'

export interface NewTicket {
  eventId: string
  type: string
  price: number // the API wants more than 0
  totalQuantity: number
  maxPerOrder: number
}

// PATCH body: only what changed. The API cannot change maxPerOrder after creating.
export type TicketPatch = Partial<Pick<NewTicket, 'type' | 'price' | 'totalQuantity'>>

export const createTicket = (body: NewTicket) => api<unknown>('/tickets', { method: 'POST', body })
export const updateTicket = (id: string, body: TicketPatch) => api<unknown>(`/tickets/${id}`, { method: 'PATCH', body })
export const deleteTicket = (id: string) => api<void>(`/tickets/${id}`, { method: 'DELETE' }) // 409 when some is sold or held
