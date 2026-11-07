import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pick as choose } from '@/test/pick'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import { AuthContext } from '@/auth/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { BookingsPage } from './BookingsPage'

const ev = (id: string, title: string) => ({
  id, title, startsAt: '2030-11-14T19:00:00Z', location: 'L', imageUrl: 'http://s/a.jpg', category: 'C',
  minPrice: 1, maxPrice: 2, totalQuantity: 1, remainingQuantity: 1, organizer: { id: 'u2', fullName: 'Minh' },
})
const booking = (id: string, name: string, status: string) => ({
  id, eventId: 'e1', event: { id: 'e1', title: 'Midnight Echoes Live' }, tickets: [{ ticketId: 't1', type: 'General', quantity: 2, unitPrice: 25 }], quantity: 2,
  totalPrice: 50.5, status, createdAt: '2030-10-01T10:00:00Z', admissions: [], checkedInCount: 0, canCancel: status !== 'Cancelled',
  buyer: { id: `b-${id}`, fullName: name, email: `${name.split(' ')[0].toLowerCase()}@example.com` },
})

let eventRequests: URL[] = []
let bookingRequests: URL[] = []
let cancelled: string[] = []
let eventItems = [ev('e1', 'Midnight Echoes Live'), ev('e2', 'Jazz in the Park')]
const server = setupServer(
  http.get(`${API_URL}/events`, ({ request }) => {
    eventRequests.push(new URL(request.url))
    return HttpResponse.json({ items: eventItems, page: 1, pageSize: 100, totalCount: eventItems.length, totalPages: 1 })
  }),
  http.get(`${API_URL}/bookings/managed`, ({ request }) => {
    const url = new URL(request.url)
    bookingRequests.push(url)
    const status = url.searchParams.get('status')
    const all = url.searchParams.get('eventId') === 'e2'
      ? [booking('b9', 'Zed Zhou', 'Confirmed')]
      : [booking('b1', 'Bao Nguyen', 'Confirmed'), booking('b2', 'Hoa Vo', 'Pending'), booking('b3', 'Khoa Tran', 'Cancelled')]
    const items = status ? all.filter((b) => b.status === status) : all
    return HttpResponse.json({ items, page: 1, pageSize: 10, totalCount: items.length, totalPages: 1 })
  }),
  http.patch(`${API_URL}/bookings/:id/cancel`, ({ params }) => {
    cancelled.push(String(params.id))
    return HttpResponse.json(booking(String(params.id), 'Bao Nguyen', 'Cancelled'))
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  eventRequests = []
  bookingRequests = []
  cancelled = []
  eventItems = [ev('e1', 'Midnight Echoes Live'), ev('e2', 'Jazz in the Park')]
})
afterAll(() => server.close())

function renderAt(url: string, role: 'Admin' | 'Organizer' = 'Admin') {
  const auth = { user: { id: 'u2', email: 'a@b.c', fullName: 'Minh', role }, loading: false, login: async () => {}, logout: async () => {} }
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[url]}>
          <BookingsPage />
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

test('lists the bookings of all events by default, and an Organizer only picks among their own events', async () => {
  renderAt('/bookings', 'Organizer')

  expect(await screen.findByText('Bao Nguyen')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Event' })).toHaveTextContent('All events')
  expect(bookingRequests[0].searchParams.has('eventId')).toBe(false)
  expect(eventRequests[0].searchParams.get('organizerId')).toBe('u2')
})

test('?event= preselects the event, and picking another one or All events changes the request', async () => {
  const pick = userEvent.setup()
  renderAt('/bookings?event=e2')
  expect(await screen.findByText('Zed Zhou')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Event' })).toHaveTextContent('Jazz in the Park')
  expect(bookingRequests.at(-1)!.searchParams.get('eventId')).toBe('e2')
  expect(eventRequests[0].searchParams.has('organizerId')).toBe(false)

  await choose(pick, 'Event', 'Midnight Echoes Live')
  expect(await screen.findByText('Bao Nguyen')).toBeInTheDocument()
  expect(bookingRequests.at(-1)!.searchParams.get('eventId')).toBe('e1')

  await choose(pick, 'Event', 'All events')
  await waitFor(() => expect(bookingRequests.at(-1)!.searchParams.has('eventId')).toBe(false))
})

test('a status tab asks the API for that status', async () => {
  const click = userEvent.setup()
  renderAt('/bookings')
  await screen.findByText('Bao Nguyen')

  await click.click(screen.getByRole('button', { name: 'Pending' }))

  expect(await screen.findByText('Hoa Vo')).toBeInTheDocument()
  expect(screen.queryByText('Bao Nguyen')).not.toBeInTheDocument()
  expect(bookingRequests.at(-1)!.searchParams.get('status')).toBe('Pending')
})

test('the Event column shows only while All events is selected', async () => {
  const pick = userEvent.setup()
  renderAt('/bookings')
  await screen.findByText('Bao Nguyen')
  expect(screen.getByRole('columnheader', { name: 'Event' })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Midnight Echoes Live' })[0]).toHaveAttribute('href', '/events/e1')

  await choose(pick, 'Event', 'Jazz in the Park')
  await screen.findByText('Zed Zhou')

  expect(screen.queryByRole('columnheader', { name: 'Event' })).not.toBeInTheDocument()
})

test('cancelling asks first, then sends PATCH; a cancelled booking has the button off', async () => {
  const click = userEvent.setup()
  renderAt('/bookings')
  const row = (await screen.findByText('Bao Nguyen')).closest('tr')!
  expect(within(screen.getByText('Khoa Tran').closest('tr')!).getByRole('button', { name: 'Cancel booking' })).toBeDisabled()

  await click.click(within(row).getByRole('button', { name: 'Cancel booking' }))
  expect(cancelled).toEqual([])
  await click.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel booking' }))

  await waitFor(() => expect(cancelled).toEqual(['b1']))
})

test('no bookings shows the empty text', async () => {
  server.use(http.get(`${API_URL}/bookings/managed`, () => HttpResponse.json({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 })))
  renderAt('/bookings')

  expect(await screen.findByText('No bookings yet.')).toBeInTheDocument()
})

test('a 403 shows an alert instead of data', async () => {
  server.use(http.get(`${API_URL}/bookings/managed`, () => new HttpResponse(null, { status: 403 })))
  renderAt('/bookings')

  expect(await screen.findByText("You don't have permission to do that.")).toBeInTheDocument()
  expect(screen.queryByText('Bao Nguyen')).not.toBeInTheDocument()
})
