import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pick } from '@/test/pick'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import type { EventDetail } from '@/api/events'
import { AuthContext } from '@/auth/useAuth'
import { EventFormPage } from './EventFormPage'

const event: EventDetail = {
  id: 'e1',
  title: 'Midnight Echoes Live',
  description: 'Two sets.',
  startsAt: '2026-11-14T19:00:00.000Z',
  location: 'The Fillmore',
  imageUrl: 'http://storage.test/events/images/a.jpg',
  category: 'Concerts',
  highlights: ['Two live sets'],
  organizer: { id: 'u2', fullName: 'Minh Le' },
}

let patches: unknown[] = []
let created: unknown[] = []
const server = setupServer(
  http.get(`${API_URL}/events/categories`, () => HttpResponse.json(['Concerts'])),
  http.get(`${API_URL}/events/e1`, () => HttpResponse.json(event)),
  http.get(`${API_URL}/users`, () =>
    HttpResponse.json({
      items: [{ id: 'u2', fullName: 'Minh Le', email: 'minh@example.com', role: 'Organizer', isActive: true, createdAt: '', updatedAt: '' }],
      page: 1,
      pageSize: 100,
      totalCount: 1,
      totalPages: 1,
    }),
  ),
  http.post(`${API_URL}/events/image-upload`, () =>
    HttpResponse.json({ uploadUrl: 'http://storage.test/put', fileUrl: 'http://storage.test/events/images/new.png' }),
  ),
  http.put('http://storage.test/put', () => new HttpResponse(null, { status: 200 })),
  http.post(`${API_URL}/events`, async ({ request }) => {
    created.push(await request.json())
    return HttpResponse.json(event)
  }),
  http.patch(`${API_URL}/events/e1`, async ({ request }) => {
    patches.push(await request.json())
    return HttpResponse.json(event)
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  patches = []
  created = []
})
afterAll(() => server.close())

function renderAt(path: string, role: 'Admin' | 'Organizer' = 'Admin', history: string[] = [path]) {
  const auth = {
    user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Tran', role },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
          <Routes>
            <Route path="/events/:id/edit" element={<EventFormPage />} />
            <Route path="/events/new" element={<EventFormPage />} />
            <Route path="/events/:id" element={<p>event detail</p>} />
            <Route path="/events" element={<p>events list</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}
const renderEdit = () => renderAt('/events/e1/edit')

async function fillNewEvent(typing: ReturnType<typeof userEvent.setup>) {
  await typing.type(await screen.findByLabelText('Title'), 'Neon Nights')
  await typing.type(screen.getByLabelText('Category'), 'Concerts')
  await typing.type(screen.getByLabelText('Venue'), 'Hanoi')
  fireEvent.change(screen.getByLabelText('Starts at'), { target: { value: '2030-01-01T19:00' } })
  await typing.upload(screen.getByLabelText('Poster file'), new File(['png'], 'poster.png', { type: 'image/png' }))
  await typing.click(screen.getByRole('button', { name: 'Create event' }))
}

test('editing only the title sends a PATCH with only the title', async () => {
  const typing = userEvent.setup()
  renderEdit()
  const title = await screen.findByLabelText('Title')

  await typing.clear(title)
  await typing.type(title, 'Midnight Echoes Encore')
  await typing.click(screen.getByRole('button', { name: 'Save changes' }))

  await waitFor(() => expect(patches).toEqual([{ title: 'Midnight Echoes Encore' }]))
  expect(await screen.findByText('event detail')).toBeInTheDocument()
})

test('saving without changes sends nothing', async () => {
  const typing = userEvent.setup()
  renderEdit()
  await typing.click(await screen.findByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('event detail')).toBeInTheDocument()
  expect(patches).toEqual([])
})

test('a 403 from the API is shown on the form', async () => {
  server.use(http.patch(`${API_URL}/events/e1`, () => new HttpResponse(null, { status: 403 })))
  const typing = userEvent.setup()
  renderEdit()
  const title = await screen.findByLabelText('Title')

  await typing.type(title, '!')
  await typing.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText("You don't have permission to do that.")).toBeInTheDocument()
})

test('an admin can create the event for an organizer picked from the list', async () => {
  const typing = userEvent.setup()
  renderAt('/events/new')

  await screen.findByRole('combobox', { name: 'Organizer' })
  await pick(typing, 'Organizer', 'Minh Le')
  await fillNewEvent(typing)

  await waitFor(() => expect(created).toHaveLength(1))
  expect(created[0]).toMatchObject({ title: 'Neon Nights', organizerId: 'u2', imageUrl: 'http://storage.test/events/images/new.png' })
})

test('an admin who leaves "Me" selected sends no organizerId', async () => {
  const typing = userEvent.setup()
  renderAt('/events/new')
  await screen.findByLabelText('Organizer')
  await fillNewEvent(typing)

  await waitFor(() => expect(created).toHaveLength(1))
  expect(created[0]).not.toHaveProperty('organizerId')
})

test('an organizer gets no organizer picker', async () => {
  renderAt('/events/new', 'Organizer')

  await screen.findByLabelText('Title')
  expect(screen.queryByLabelText('Organizer')).not.toBeInTheDocument()
})

test('Cancel goes back to the page the user came from, not always to the list', async () => {
  const click = userEvent.setup()
  renderAt('/events/e1/edit', 'Admin', ['/events', '/events/e1/edit'])

  await click.click(await screen.findByRole('button', { name: 'Cancel' }))

  expect(await screen.findByText('events list')).toBeInTheDocument()
})

test('Cancel on a page opened directly goes to the event', async () => {
  const click = userEvent.setup()
  renderAt('/events/e1/edit')

  await click.click(await screen.findByRole('button', { name: 'Cancel' }))

  expect(await screen.findByText('event detail')).toBeInTheDocument()
})

test('the Back link also returns to the previous page', async () => {
  const click = userEvent.setup()
  renderAt('/events/e1/edit', 'Admin', ['/events', '/events/e1/edit'])

  await click.click(await screen.findByRole('link', { name: 'Event' }))

  expect(await screen.findByText('events list')).toBeInTheDocument()
})
