import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import { BookingsTable } from '@/components/BookingsTable'
import { Toaster } from '@/components/ui/sonner'
import { BookingDetailPage } from './BookingDetailPage'

const buyer = { id: 'u7', fullName: 'Bao Nguyen', email: 'bao@example.com' }
const booking = {
  id: 'booking_4f2a9c',
  eventId: 'e1',
  event: { id: 'e1', title: 'Midnight Echoes Live', startsAt: '2030-11-14T19:00:00Z', location: 'The Fillmore' },
  tickets: [{ ticketId: 't1', type: 'General Admission', quantity: 2, unitPrice: 25 }],
  quantity: 2,
  subtotal: 50,
  serviceFee: 0.5,
  totalPrice: 50.5,
  status: 'Confirmed',
  createdAt: '2030-11-03T09:41:00Z',
  expiresAt: '2030-11-03T09:56:00Z',
  checkedInCount: 0,
  canCancel: true,
  admissions: [
    { id: 'adm_1', ticketType: 'General Admission', code: 'eh2.adm_1.sig', shortCode: 'K7Q49XMD', checkedInAt: null, checkedInBy: null },
    { id: 'adm_2', ticketType: 'General Admission', code: 'eh2.adm_2.sig', shortCode: 'B2C3D4E5', checkedInAt: null, checkedInBy: null },
  ],
}

let current: Record<string, unknown> = booking
let cancels: string[] = []
const server = setupServer(
  http.get(`${API_URL}/bookings/booking_4f2a9c`, () => HttpResponse.json(current)),
  http.patch(`${API_URL}/bookings/:id/cancel`, ({ params }) => {
    cancels.push(String(params.id))
    return HttpResponse.json({ ...booking, status: 'Cancelled', admissions: [], canCancel: false })
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  current = booking
  cancels = []
})
afterAll(() => server.close())

function renderDetail(state?: unknown) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: '/bookings/booking_4f2a9c', state }]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('shows the summary, the items and the totals', async () => {
  renderDetail({ buyer })

  expect(await screen.findByRole('heading', { level: 1, name: 'Booking 4F2A9C' })).toBeInTheDocument()
  expect(await screen.findByText('Confirmed')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Bao Nguyen' })).toHaveAttribute('href', '/users/u7')
  expect(screen.getByRole('link', { name: 'Midnight Echoes Live' })).toHaveAttribute('href', '/events/e1')
  const row = screen.getByText('General Admission').closest('tr')!
  expect(within(row).getByText('$50.00')).toBeInTheDocument()
  expect(screen.getByText('$0.50')).toBeInTheDocument()
  expect(screen.getByText('$50.50')).toBeInTheDocument()
})

test('a Confirmed booking shows each ticket code as text and as a QR code', async () => {
  renderDetail()

  expect(await screen.findByText('K7Q4 9XMD')).toBeInTheDocument()
  expect(screen.getByText('B2C3 D4E5')).toBeInTheDocument()
  expect(screen.getByText('Ticket 2 of 2 · General Admission')).toBeInTheDocument()
  expect(screen.getAllByText('Not used')).toHaveLength(2)
  expect(screen.queryByText('USED')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'QR code for ticket 1' }).tagName.toLowerCase()).toBe('svg')
  expect(screen.getByRole('img', { name: 'QR code for ticket 2' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copy ticket 1 code' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copy booking id' })).toBeInTheDocument()
})

test('a Pending booking has no codes and shows when the hold ends', async () => {
  current = { ...booking, status: 'Pending', admissions: [] }
  renderDetail()

  expect(await screen.findByText(/Held until/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Ticket codes' })).not.toBeInTheDocument()
})

test('cancelling asks first and then sends the PATCH', async () => {
  const click = userEvent.setup()
  renderDetail({ buyer })
  await click.click(await screen.findByRole('button', { name: 'Cancel booking' }))
  expect(cancels).toEqual([])

  await click.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel booking' }))

  await waitFor(() => expect(cancels).toEqual(['booking_4f2a9c']))
})

test('a 403 shows an alert and no data', async () => {
  server.use(http.get(`${API_URL}/bookings/booking_4f2a9c`, () => new HttpResponse(null, { status: 403 })))
  renderDetail()

  expect(await screen.findByText("You don't have permission to do that.")).toBeInTheDocument()
  expect(screen.queryByText('General Admission')).not.toBeInTheDocument()
})

test('a click on a row of the bookings table opens that booking, with the buyer', async () => {
  const click = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/list']}>
        <Routes>
          <Route path="/list" element={<BookingsTable bookings={[{ ...booking, buyer } as never]} onCancel={() => {}} />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  await click.click(screen.getByText('bao@example.com'))

  expect(await screen.findByRole('heading', { level: 1, name: 'Booking 4F2A9C' })).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: 'Bao Nguyen' })).toBeInTheDocument()
})

test('a checked-in ticket is dimmed and marked USED; the booking can no longer be cancelled', async () => {
  current = {
    ...booking,
    checkedInCount: 1,
    canCancel: false,
    admissions: [
      { ...booking.admissions[0], checkedInAt: '2030-11-14T19:42:00Z', checkedInBy: { id: 's1', fullName: 'Linh Pham' } },
      booking.admissions[1],
    ],
  }
  renderDetail({ buyer })

  expect(await screen.findByText('USED')).toBeInTheDocument()
  expect(screen.getAllByText('USED')).toHaveLength(1)
  expect(screen.getByText(/Checked in .* by Linh Pham/)).toBeInTheDocument()
  expect(screen.getByText('Not used')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'QR code for ticket 1' }).parentElement).toHaveClass('opacity-35')
  expect(screen.getByRole('img', { name: 'QR code for ticket 2' }).parentElement).not.toHaveClass('opacity-35')
  expect(screen.getByText('1 of 2 checked in')).toBeInTheDocument()
  expect(screen.getByText('Already checked in, so this booking can no longer be cancelled.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeDisabled()
})

test('when every ticket is in, the summary says Checked in', async () => {
  const at = '2030-11-14T19:42:00Z'
  current = {
    ...booking,
    checkedInCount: 2,
    canCancel: false,
    admissions: booking.admissions.map((a) => ({ ...a, checkedInAt: at, checkedInBy: null })),
  }
  renderDetail({ buyer })

  expect(await screen.findAllByText('USED')).toHaveLength(2)
  expect(screen.getAllByText('Checked in').length).toBeGreaterThan(0)
})

test('the bookings table shows the check-in count and turns Cancel off', async () => {
  const row = { ...booking, id: 'booking_x', buyer, checkedInCount: 1, canCancel: false, quantity: 3 }
  render(
    <MemoryRouter>
      <BookingsTable bookings={[row as never]} onCancel={() => {}} />
    </MemoryRouter>,
  )

  expect(screen.getByText('1 of 3 checked in')).toBeInTheDocument()
  const cancel = screen.getByRole('button', { name: 'Cancel booking' })
  expect(cancel).toBeDisabled()
  expect(cancel).toHaveAttribute('title', 'Already checked in')
})
