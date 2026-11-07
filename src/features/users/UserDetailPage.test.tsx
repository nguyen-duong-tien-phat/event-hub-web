import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import type { UserDto } from '@/api/types'
import { AuthContext } from '@/auth/useAuth'
import { UserDetailPage } from './UserDetailPage'

const user = (id: string, fullName: string, role: UserDto['role']): UserDto => ({
  id,
  fullName,
  email: `${fullName.split(' ')[0].toLowerCase()}@example.com`,
  role,
  isActive: true,
  createdAt: '2026-03-03T10:00:00Z',
  updatedAt: '2026-03-03T10:00:00Z',
})
const users: Record<string, UserDto> = {
  u1: user('u1', 'Ann Tran', 'Admin'),
  u2: user('u2', 'Minh Le', 'Organizer'),
  u3: user('u3', 'Bao Nguyen', 'Attendee'),
}

const day = 86_400_000
const events = [
  { id: 'e1', title: 'Jazz in the Park', startsAt: new Date(Date.now() + 30 * day).toISOString() },
  { id: 'e2', title: 'Autumn Wine Tasting', startsAt: new Date(Date.now() - 30 * day).toISOString() },
]
const stats: Record<string, object> = {
  e1: { eventId: 'e1', ticketRevenue: 240, ticketsSold: 20, checkedIn: 0, tickets: [{ totalQuantity: 200, remainingQuantity: 180 }] },
  e2: { eventId: 'e2', ticketRevenue: 100, ticketsSold: 10, checkedIn: 8, tickets: [{ totalQuantity: 10, remainingQuantity: 0 }] },
}

const booking = (id: string, status: string, checkedInCount: number) => ({
  id,
  eventId: 'e1',
  event: { id: 'e1', title: 'Jazz in the Park', startsAt: '2026-11-21T16:00:00Z', location: 'Riverside Park' },
  tickets: [{ ticketId: 't1', type: 'General', quantity: 2, unitPrice: 12 }],
  quantity: 2,
  totalPrice: 24.24,
  status,
  createdAt: '2026-11-01T10:00:00Z',
  admissions: [],
  checkedInCount,
  canCancel: checkedInCount === 0,
})

let historyRequests: URL[] = []
let history: ReturnType<typeof booking>[] = [booking('b1', 'Confirmed', 1), booking('b2', 'Cancelled', 0)]
let eventRequests: URL[] = []
let patches: { url: string; body: unknown }[] = []
const server = setupServer(
  http.get(`${API_URL}/users/:id`, ({ params }) => {
    const found = users[params.id as string]
    return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 })
  }),
  http.get(`${API_URL}/events`, ({ request }) => {
    eventRequests.push(new URL(request.url))
    return HttpResponse.json({ items: events, page: 1, pageSize: 100, totalCount: 2, totalPages: 1 })
  }),
  http.get(`${API_URL}/bookings/managed`, ({ request }) => {
    historyRequests.push(new URL(request.url))
    return HttpResponse.json({ items: history, page: 1, pageSize: 10, totalCount: history.length, totalPages: 1 })
  }),
  http.get(`${API_URL}/events/:id/stats`, ({ params }) => HttpResponse.json(stats[params.id as string])),
  http.patch(`${API_URL}/users/:id/:field`, async ({ request }) => {
    patches.push({ url: new URL(request.url).pathname, body: await request.json() })
    return HttpResponse.json(users.u2)
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  eventRequests = []
  historyRequests = []
  history = [booking('b1', 'Confirmed', 1), booking('b2', 'Cancelled', 0)]
  patches = []
})
afterAll(() => server.close())

function renderAt(id: string) {
  const auth = {
    user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Tran', role: 'Admin' as const },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/users/${id}`]}>
          <Routes>
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/bookings/:id" element={<p>booking page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

test('an organizer shows the profile, their events and the summed numbers', async () => {
  renderAt('u2')

  expect(await screen.findByRole('heading', { level: 1, name: 'Minh Le' })).toBeInTheDocument()
  const summary = await screen.findByRole('region', { name: 'Organizer summary' })
  await waitFor(() => expect(within(summary).getByText('$340.00')).toBeInTheDocument())
  expect(within(summary).getByText('30')).toBeInTheDocument() // tickets sold
  expect(within(summary).getByText('8 of 10')).toBeInTheDocument() // check-ins against tickets of past events
  expect(within(summary).getByText('1 upcoming · 1 past')).toBeInTheDocument()

  const jazz = screen.getByText('Jazz in the Park').closest('tr')!
  expect(within(jazz).getByText('20 of 200')).toBeInTheDocument()
  expect(within(jazz).getByText('On sale')).toBeInTheDocument()
  expect(within(screen.getByText('Autumn Wine Tasting').closest('tr')!).getByText('Past')).toBeInTheDocument()
  expect(eventRequests[0].searchParams.get('organizerId')).toBe('u2')
})

test("an attendee shows their booking history with check-in text, and no events or stats requests", async () => {
  renderAt('u3')

  expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
  expect(screen.getByText('Bookings made by Bao Nguyen')).toBeInTheDocument()
  const confirmed = (await screen.findAllByText('Jazz in the Park'))[0].closest('tr')!
  expect(within(confirmed).getByText('2 × General')).toBeInTheDocument()
  expect(within(confirmed).getByText('1 of 2 checked in')).toBeInTheDocument()
  expect(within(confirmed).getByText('$24.24')).toBeInTheDocument()
  expect(historyRequests[0].searchParams.get('userId')).toBe('u3')
  expect(eventRequests).toEqual([])
  expect(screen.queryByText(/No activity to show/)).not.toBeInTheDocument()
})

test('the history tabs filter on the server', async () => {
  const click = userEvent.setup()
  renderAt('u3')
  await screen.findAllByText('Jazz in the Park')

  await click.click(screen.getByRole('button', { name: 'Cancelled' }))

  await waitFor(() => expect(historyRequests.at(-1)!.searchParams.get('status')).toBe('Cancelled'))
})

test('a click on a history row opens the booking', async () => {
  const click = userEvent.setup()
  renderAt('u3')

  await click.click((await screen.findAllByText('2 × General'))[0])

  expect(await screen.findByText('booking page')).toBeInTheDocument()
})

test('an attendee without bookings sees the empty state', async () => {
  history = []
  renderAt('u3')

  expect(await screen.findByText('No bookings yet.')).toBeInTheDocument()
})

test('an admin account has no history, only the no-activity card', async () => {
  renderAt('u1')

  expect(await screen.findByText('No activity to show for Admin accounts.')).toBeInTheDocument()
  expect(historyRequests).toEqual([])
})

test('a missing user shows an error alert', async () => {
  renderAt('nope')

  expect(await screen.findByText('Could not load this user')).toBeInTheDocument()
  expect(screen.getByText(/Not found\./)).toBeInTheDocument()
})

test('blocks the user from the header, and not yourself', async () => {
  const click = userEvent.setup()
  renderAt('u2')
  await click.click(await screen.findByRole('button', { name: 'Block' }))
  await waitFor(() => expect(patches).toContainEqual({ url: '/users/u2/active', body: { isActive: false } }))
})

test('your own page has the role and Block controls locked', async () => {
  renderAt('u1')

  expect(await screen.findByRole('heading', { level: 1, name: 'Ann Tran (you)' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Block' })).toBeDisabled()
  expect(screen.getByRole('combobox', { name: 'Role of Ann Tran' })).toBeDisabled()
  expect(screen.getByText('No activity to show for Admin accounts.')).toBeInTheDocument()
})
