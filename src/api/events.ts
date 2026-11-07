import { api } from "./client";
import type { Paged } from "./types";

export type EventSort = "StartsAt" | "StartsAtDesc" | "Newest";

// Fields of GET /events items that the dashboard reads; the rest is in EventHub.Core/Events.
export interface EventListItem {
  id: string;
  title: string;
  startsAt: string; // UTC
  location: string;
  imageUrl: string;
  category: string;
  minPrice: number | null; // cheapest ticket, null when the event has none
  maxPrice: number | null; // dearest ticket
  totalQuantity: number; // seats over all ticket types
  remainingQuantity: number; // seats still for sale
  organizer: { id: string; fullName: string };
}

// GET /events/{id}
// GET /events/{id} has no price or seat sums: those come only with list items.
export interface EventDetail extends Omit<
  EventListItem,
  "minPrice" | "maxPrice" | "totalQuantity" | "remainingQuantity"
> {
  description: string;
  highlights: string[];
}

export interface NewEvent {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: string;
  imageUrl: string; // required by the API: it must be the fileUrl of an upload
  organizerId?: string; // Admin only: create the event for this organizer; left out, it is the caller's
  highlights: string[];
}

// PATCH body: only what changed. highlights replaces the whole list.
export type EventPatch = Partial<NewEvent>;

export interface EventFilters {
  search: string;
  category: string; // '' for all
  sort: EventSort;
  organizerId?: string;
  page: number;
  pageSize: number;
}

export function listEvents({
  search,
  category,
  sort,
  organizerId,
  page,
  pageSize,
}: EventFilters) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });
  if (search) query.set("search", search);
  if (category) query.set("category", category);
  if (organizerId) query.set("organizerId", organizerId);
  return api<Paged<EventListItem>>(`/events?${query}`);
}

export const listCategories = () => api<string[]>("/events/categories");
export const getEvent = (id: string) => api<EventDetail>(`/events/${id}`);
export const createEvent = (body: NewEvent) =>
  api<EventDetail>("/events", { method: "POST", body });
export const updateEvent = (id: string, body: EventPatch) =>
  api<EventDetail>(`/events/${id}`, { method: "PATCH", body });
export const deleteEvent = (id: string) =>
  api<void>(`/events/${id}`, { method: "DELETE" }); // 409 when it has bookings

// shortcut: first 100 events only (the API's page size limit), page through if an organizer ever has more.
export const listEventsByOrganizer = (organizerId: string) =>
  api<Paged<EventListItem>>(
    `/events?${new URLSearchParams({ organizerId, pageSize: "100", sort: "StartsAtDesc" })}`,
  );

// One ticket type in GET /events/{id}/stats.
export interface TicketStats {
  ticketId: string;
  type: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
  sold: number; // in confirmed bookings
  held: number; // taken out of stock by pending bookings
}

export interface EventStats {
  eventId: string;
  bookings: { pending: number; confirmed: number; cancelled: number };
  ticketRevenue: number; // without the service fee
  serviceFees: number;
  ticketsSold: number; // confirmed bookings only
  checkedIn: number;
  tickets: TicketStats[];
}

export const getEventStats = (id: string) =>
  api<EventStats>(`/events/${id}/stats`);

// GET /events/{id}/admissions: who holds a ticket and whether they got in (the event's organizer or an admin).
export interface EventAdmission {
  id: string
  ticketType: string
  shortCode: string
  checkedInAt: string | null // UTC
  checkedInBy: { id: string; fullName: string } | null
  bookingId: string
  buyer: { id: string; fullName: string; email: string }
}

export const listEventAdmissions = (
  eventId: string,
  { checkedIn, search, page, pageSize }: { checkedIn?: boolean; search: string; page: number; pageSize: number },
) => {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (checkedIn !== undefined) query.set('checkedIn', String(checkedIn))
  if (search) query.set('search', search)
  return api<Paged<EventAdmission>>(`/events/${eventId}/admissions?${query}`)
}
