import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import { Toaster } from '@/components/ui/sonner'
import { EventDetailPage } from './EventDetailPage'

const event = {
  id: 'e1',
  title: 'Midnight Echoes Live',
  description: 'Two sets.',
  startsAt: '2030-11-14T19:00:00Z',
  location: 'The Fillmore',
  imageUrl: 'http://storage.test/a.jpg',
  category: 'Concerts',
  highlights: ['Two live sets'],
  organizer: { id: 'u2', fullName: 'Minh Le' },
}
const stats = {
  eventId: 'e1',
  bookings: { pending: 5, confirmed: 118, cancelled: 7 },
  ticketRevenue: 8364,
  serviceFees: 83.64,
  ticketsSold: 264,
  checkedIn: 3,
  tickets: [
    { ticketId: 't1', type: 'General', price: 25, totalQuantity: 220, remainingQuantity: 4, sold: 204, held: 12 },
    { ticketId: 't2', type: 'Early Bird', price: 18, totalQuantity: 20, remainingQuantity: 20, sold: 0, held: 0 },
  ],
}
const booking = (id: string, name: string, status: string) => ({
  id,
  eventId: 'e1',
  tickets: [{ ticketId: 't1', type: 'General', quantity: 2, unitPrice: 25 }],
  quantity: 2,
  totalPrice: 50.5,
  status,
  createdAt: '2030-10-01T10:00:00Z',
  buyer: { id: `b-${id}`, fullName: name, email: `${name.split(' ')[0].toLowerCase()}@example.com` },
})

let calls: { method: string; path: string; body?: unknown }[] = []
const record = async (request: Request) =>
  calls.push({ method: request.method, path: new URL(request.url).pathname, body: request.method === 'GET' ? undefined : await request.json().catch(() => undefined) })
const server = setupServer(
  http.get(`${API_URL}/events/e1`, () => HttpResponse.json(event)),
  http.get(`${API_URL}/events/e1/stats`, () => HttpResponse.json(stats)),
  http.get(`${API_URL}/bookings/by-event/e1`, () =>
    HttpResponse.json({
      items: [booking('b1', 'Bao Nguyen', 'Confirmed'), booking('b2', 'Khoa Tran', 'Cancelled')],
      page: 1,
      pageSize: 10,
      totalCount: 2,
      totalPages: 1,
    }),
  ),
  http.post(`${API_URL}/tickets`, async ({ request }) => {
    await record(request)
    return HttpResponse.json({})
  }),
  http.delete(`${API_URL}/tickets/:id`, async ({ request }) => {
    await record(request)
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch(`${API_URL}/bookings/:id/cancel`, async ({ request }) => {
    await record(request)
    return HttpResponse.json(booking('b1', 'Bao Nguyen', 'Cancelled'))
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  calls = []
})
afterAll(() => server.close())

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/events/e1']}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events" element={<p>events list</p>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('shows the event, the sales numbers, its tickets and bookings', async () => {
  renderPage()

  expect(await screen.findByRole('heading', { level: 1, name: 'Midnight Echoes Live' })).toBeInTheDocument()
  const summary = await screen.findByRole('region', { name: 'Sales summary' })
  expect(within(summary).getByText('130')).toBeInTheDocument() // 118 + 5 + 7
  expect(within(summary).getByText('118 confirmed · 5 pending · 7 cancelled')).toBeInTheDocument()
  expect(within(summary).getByText('$8,364.00')).toBeInTheDocument()
  expect(within(summary).getByText('Without $83.64 in service fees')).toBeInTheDocument()
  expect(within(summary).getByText('264')).toBeInTheDocument()
  expect(within(summary).getByText('12 held by pending bookings')).toBeInTheDocument()
  expect(await screen.findByText('Bao Nguyen')).toBeInTheDocument()
  expect(screen.getByText('bao@example.com')).toBeInTheDocument()
  expect(screen.getAllByText('2 × General')).toHaveLength(2)
})

test('adds a ticket with POST /tickets', async () => {
  const typing = userEvent.setup()
  renderPage()
  await typing.click(await screen.findByRole('button', { name: 'Add ticket' }))
  const dialog = await screen.findByRole('dialog')

  await typing.type(within(dialog).getByLabelText('Name'), 'VIP')
  await typing.type(within(dialog).getByLabelText('Price (USD)'), '60')
  await typing.type(within(dialog).getByLabelText('Total tickets'), '50')
  await typing.click(within(dialog).getByRole('button', { name: 'Add ticket' }))

  await waitFor(() =>
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/tickets',
      body: { eventId: 'e1', type: 'VIP', price: 60, totalQuantity: 50, maxPerOrder: 4 },
    }),
  )
})

test('a ticket that has sold cannot be deleted; an unsold one can', async () => {
  const click = userEvent.setup()
  renderPage()
  const rows = await screen.findAllByRole('row')
  const general = rows.find((r) => within(r).queryByText('General') && within(r).queryByRole('button', { name: 'Delete' }))!
  expect(within(general).getByRole('button', { name: 'Delete' })).toBeDisabled()

  const early = rows.find((r) => within(r).queryByText('Early Bird'))!
  await click.click(within(early).getByRole('button', { name: 'Delete' }))
  await click.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete ticket' }))

  await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: '/tickets/t2', body: undefined }))
})

test('the 409 message of a ticket delete is shown as it is', async () => {
  server.use(
    http.delete(`${API_URL}/tickets/t2`, () =>
      HttpResponse.json({ message: 'Some of this ticket is already sold or held, so it cannot be deleted.' }, { status: 409 }),
    ),
  )
  const click = userEvent.setup()
  renderPage()
  const early = (await screen.findAllByRole('row')).find((r) => within(r).queryByText('Early Bird'))!

  await click.click(within(early).getByRole('button', { name: 'Delete' }))
  await click.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete ticket' }))

  expect(await screen.findByText('Some of this ticket is already sold or held, so it cannot be deleted.')).toBeInTheDocument()
})

test('cancelling a booking asks first, then sends PATCH /bookings/{id}/cancel', async () => {
  const click = userEvent.setup()
  renderPage()
  const row = (await screen.findByText('Bao Nguyen')).closest('tr')!

  await click.click(within(row).getByRole('button', { name: 'Cancel booking' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/refunded/)).toBeInTheDocument()
  expect(calls).toEqual([])
  await click.click(within(dialog).getByRole('button', { name: 'Cancel booking' }))

  await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', path: '/bookings/b1/cancel', body: undefined }))
  expect(within(screen.getByText('Khoa Tran').closest('tr')!).getByRole('button', { name: 'Cancel booking' })).toBeDisabled()
})

test("someone else's event shows the API's 403 and none of its data", async () => {
  server.use(http.get(`${API_URL}/events/e1/stats`, () => new HttpResponse(null, { status: 403 })))
  renderPage()

  expect(await screen.findByText("You don't have permission to do that.")).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Sales summary' })).not.toBeInTheDocument()
  expect(screen.queryByText('Bao Nguyen')).not.toBeInTheDocument()
})
