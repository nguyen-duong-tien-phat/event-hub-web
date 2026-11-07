import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pick } from '@/test/pick'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, useLocation } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import type { EventListItem } from '@/api/events'
import type { Role } from '@/api/types'
import { AuthContext } from '@/auth/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { EventsPage } from './EventsPage'

const rows: EventListItem[] = [
  {
    id: 'e1',
    title: 'Midnight Echoes Live',
    startsAt: '2026-11-14T19:00:00Z',
    location: 'The Fillmore',
    imageUrl: 'http://storage.test/a.jpg',
    category: 'Concerts',
    minPrice: 25,
    maxPrice: 80,
    totalQuantity: 300,
    remainingQuantity: 24,
    organizer: { id: 'u2', fullName: 'Minh Le' },
  },
]

let requests: URL[] = []
let userSearches: (string | null)[] = []
const server = setupServer(
  http.get(`${API_URL}/users`, ({ request }) => {
    userSearches.push(new URL(request.url).searchParams.get('search'))
    return HttpResponse.json({
      items: [{ id: 'u9', fullName: 'Linh Pham', email: 'linh@example.com', role: 'Organizer', isActive: true, createdAt: '', updatedAt: '' }],
      page: 1,
      pageSize: 100,
      totalCount: 1,
      totalPages: 1,
    })
  }),
  http.get(`${API_URL}/events/categories`, () => HttpResponse.json(['Concerts', 'Food'])),
  http.get(`${API_URL}/events`, ({ request }) => {
    requests.push(new URL(request.url))
    return HttpResponse.json({ items: rows, page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  requests = []
  userSearches = []
})
afterAll(() => server.close())

const LocationProbe = () => <p data-testid="path">{useLocation().pathname}</p>

function renderPage(role: Role) {
  const auth = {
    user: { id: 'u2', email: 'minh@example.com', fullName: 'Minh Le', role },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <EventsPage />
          <LocationProbe />
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

test('an Organizer only asks for their own events, with search, category and sort', async () => {
  const typing = userEvent.setup()
  renderPage('Organizer')
  await screen.findByText('Midnight Echoes Live')
  expect(requests[0].searchParams.get('organizerId')).toBe('u2')
  expect(screen.queryByRole('button', { name: 'My events' })).not.toBeInTheDocument()

  await typing.type(screen.getByLabelText('Search events by title'), 'echo')
  await screen.findByRole('combobox', { name: 'Category' })
  await pick(typing, 'Category', 'Food')
  await pick(typing, 'Sort by', 'Newest added')

  await waitFor(() => {
    const last = requests.at(-1)!.searchParams
    expect(last.get('search')).toBe('echo')
    expect(last.get('category')).toBe('Food')
    expect(last.get('sort')).toBe('Newest')
    expect(last.get('organizerId')).toBe('u2')
  })
})

test("an Admin sees all events until they pick an organizer, or their own", async () => {
  const click = userEvent.setup()
  renderPage('Admin')
  await screen.findByText('Midnight Echoes Live')
  expect(requests[0].searchParams.has('organizerId')).toBe(false)
  await pick(click, 'Organizer', 'Linh Pham')
  await waitFor(() => expect(requests.at(-1)!.searchParams.get('organizerId')).toBe('u9'))

  await pick(click, 'Organizer', 'My events')
  await waitFor(() => expect(requests.at(-1)!.searchParams.get('organizerId')).toBe('u2'))

  await pick(click, 'Organizer', 'All organizers')
  await waitFor(() => expect(requests.at(-1)!.searchParams.has('organizerId')).toBe(false))
})

test('an Organizer gets no organizer filter', async () => {
  renderPage('Organizer')
  await screen.findByText('Midnight Echoes Live')
  expect(screen.queryByLabelText('Organizer')).not.toBeInTheDocument()
})

test('deleting an event that has bookings shows the API message', async () => {
  server.use(
    http.delete(`${API_URL}/events/e1`, () =>
      HttpResponse.json({ message: 'This event has bookings and cannot be deleted.' }, { status: 409 }),
    ),
  )
  const click = userEvent.setup()
  renderPage('Organizer')
  await screen.findByText('Midnight Echoes Live')

  await click.click(screen.getByRole('button', { name: 'Open menu for Midnight Echoes Live' }))
  await click.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  await click.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete event' }))

  expect(await screen.findByText('This event has bookings and cannot be deleted.')).toBeInTheDocument()
})

test('shows how many tickets are left, with a status', async () => {
  renderPage('Organizer')

  expect(await screen.findByText('24 of 300 left')).toBeInTheDocument()
  expect(screen.getByText('Few left')).toBeInTheDocument()
  expect(screen.getByText('$25.00 – $80.00')).toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'From' })).not.toBeInTheDocument()
})

test('clicking a row opens the event, but clicking its menu does not', async () => {
  const click = userEvent.setup()
  renderPage('Organizer')
  await screen.findByText('Midnight Echoes Live')

  await click.click(screen.getByRole('button', { name: 'Open menu for Midnight Echoes Live' }))
  await click.keyboard('{Escape}')
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/)

  await click.click(screen.getByRole('cell', { name: 'Concerts' }))
  expect(screen.getByTestId('path')).toHaveTextContent('/events/e1')
})

test("an Admin's Organizer column links to that user, or to My profile for their own events", async () => {
  server.use(
    http.get(`${API_URL}/events`, () =>
      HttpResponse.json({
        items: [
          { ...rows[0], id: 'e1', title: 'Theirs', organizer: { id: 'u9', fullName: 'Linh Pham' } },
          { ...rows[0], id: 'e2', title: 'Mine', organizer: { id: 'u2', fullName: 'Minh Le' } },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 1,
      }),
    ),
  )
  renderPage('Admin')

  expect(await screen.findByRole('link', { name: 'Linh Pham' })).toHaveAttribute('href', '/users/u9')
  expect(screen.getByRole('link', { name: 'Minh Le' })).toHaveAttribute('href', '/profile')
})

test('typing in the organizer filter searches organizers on the server', async () => {
  const typing = userEvent.setup()
  renderPage('Admin')
  await screen.findByText('Midnight Echoes Live')

  await typing.click(screen.getByRole('combobox', { name: 'Organizer' }))
  await typing.type(screen.getByPlaceholderText('Search organizers…'), 'lin')

  await waitFor(() => expect(userSearches.at(-1)).toBe('lin'))
  expect(await screen.findByRole('option', { name: 'Linh Pham' })).toBeInTheDocument()
})

test('Next sends the nextCursor, Previous goes back, and a filter returns to the first page', async () => {
  server.use(
    http.get(`${API_URL}/events`, ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      const second = url.searchParams.get('cursor') === 'c2'
      return HttpResponse.json({
        items: [{ ...rows[0], id: second ? 'e2' : 'e1', title: second ? 'Second page event' : 'First page event' }],
        page: 1,
        pageSize: 10,
        totalCount: 11,
        totalPages: 2,
        nextCursor: second ? null : 'c2',
      })
    }),
  )
  const click = userEvent.setup()
  renderPage('Organizer')
  expect(await screen.findByText('First page event')).toBeInTheDocument()
  expect(requests[0].searchParams.has('cursor')).toBe(false)
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

  await click.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Second page event')).toBeInTheDocument()
  expect(requests.at(-1)!.searchParams.get('cursor')).toBe('c2')
  expect(screen.getByText('Showing 11 to 11 of 11 events')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

  await click.click(screen.getByRole('button', { name: 'Previous' }))
  expect(await screen.findByText('First page event')).toBeInTheDocument()

  await click.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Second page event')
  await click.type(screen.getByLabelText('Search events by title'), 'jazz')
  await waitFor(() => expect(requests.at(-1)!.searchParams.get('search')).toBe('jazz'))
  expect(requests.at(-1)!.searchParams.has('cursor')).toBe(false)
})
