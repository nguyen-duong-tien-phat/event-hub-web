import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import { ProfilePage } from './ProfilePage'

let role = 'Organizer'
let requested: string[] = []
const server = setupServer(
  http.get(`${API_URL}/auth/me`, () => {
    requested.push('/auth/me')
    return HttpResponse.json({
      id: 'u2',
      fullName: 'Minh Le',
      email: 'minh@example.com',
      role,
      isActive: true,
      createdAt: '2026-03-03T00:00:00Z',
      updatedAt: '2026-03-03T00:00:00Z',
    })
  }),
  http.get(`${API_URL}/events/sales`, ({ request }) => {
    requested.push(`/events/sales?organizerId=${new URL(request.url).searchParams.get('organizerId')}`)
    return HttpResponse.json({
      summary: { events: 1, upcoming: 1, past: 0, ticketsSold: 20, ticketRevenue: 240, checkedIn: 0, ticketsOfPastEvents: 0, ticketsSoldOfPastEvents: 0 },
      events: { items: [], page: 1, pageSize: 10, totalCount: 1, totalPages: 1, nextCursor: null },
    })
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  role = 'Organizer'
})
afterEach(() => {
  server.resetHandlers()
  requested = []
})
afterAll(() => server.close())

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test("an Organizer's own profile shows their numbers, but no events table and no admin controls", async () => {
  renderPage()

  expect(await screen.findByText('minh@example.com')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'My profile' })).toBeInTheDocument()
  const summary = await screen.findByRole('region', { name: 'Organizer summary' })
  await waitFor(() => expect(within(summary).getByText('$240.00')).toBeInTheDocument())
  expect(within(summary).getByText('20')).toBeInTheDocument() // tickets sold
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByText('Jazz in the Park')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /block/i })).not.toBeInTheDocument()
  expect(requested).toContain('/events/sales?organizerId=u2')
})

test('an Admin profile has no numbers and asks for no events', async () => {
  role = 'Admin'
  renderPage()

  expect(await screen.findByText('minh@example.com')).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Organizer summary' })).not.toBeInTheDocument()
  expect(requested).toEqual(['/auth/me'])
})
