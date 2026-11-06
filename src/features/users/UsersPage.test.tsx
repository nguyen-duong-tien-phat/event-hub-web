import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL } from '@/api/client'
import type { UserDto } from '@/api/types'
import { AuthContext } from '@/auth/useAuth'
import { UsersPage } from './UsersPage'

const user = (id: string, fullName: string, role: UserDto['role'], isActive = true): UserDto => ({
  id,
  fullName,
  email: `${fullName.split(' ')[0].toLowerCase()}@example.com`,
  role,
  isActive,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
})

const rows = [user('u1', 'Ann Tran', 'Admin'), user('u2', 'Minh Le', 'Organizer'), user('u3', 'Hoa Vo', 'Attendee', false)]

let requests: URL[] = []
let patches: { url: string; body: unknown }[] = []
const server = setupServer(
  http.get(`${API_URL}/users`, ({ request }) => {
    requests.push(new URL(request.url))
    return HttpResponse.json({ items: rows, page: 1, pageSize: 10, totalCount: 3, totalPages: 1 })
  }),
  http.post(`${API_URL}/users`, async ({ request }) => {
    patches.push({ url: '/users', body: await request.json() })
    return HttpResponse.json(user('u9', 'Bao Nguyen', 'Attendee'))
  }),
  http.patch(`${API_URL}/users/:id/:field`, async ({ request }) => {
    patches.push({ url: new URL(request.url).pathname, body: await request.json() })
    return HttpResponse.json(rows[1])
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  requests = []
  patches = []
})
afterAll(() => server.close())

function renderPage() {
  const auth = {
    user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Tran', role: 'Admin' as const },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <UsersPage />
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

const rowOf = (name: string) => screen.getByText(new RegExp(name)).closest('tr')!

test('lists users, shows blocked ones, and keeps the signed-in admin from blocking themselves', async () => {
  renderPage()

  expect(await screen.findByText('Minh Le')).toBeInTheDocument()
  expect(screen.getByText('Ann Tran (you)')).toBeInTheDocument()
  expect(within(rowOf('Hoa Vo')).getByText('Blocked')).toBeInTheDocument()
  expect(within(rowOf('Ann Tran')).getByRole('button', { name: 'Block' })).toBeDisabled()
  expect(screen.getByText('Showing 1 to 3 of 3 users')).toBeInTheDocument()
})

test('sends the search text and the status filter to the API', async () => {
  const typing = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  await typing.type(screen.getByLabelText('Search users by name or email'), 'minh')
  await typing.selectOptions(screen.getByLabelText('Status'), 'blocked')

  await waitFor(() => {
    const last = requests.at(-1)!
    expect(last.searchParams.get('search')).toBe('minh')
    expect(last.searchParams.get('isActive')).toBe('false')
  })
})

test('blocks and unblocks an account with PATCH /users/{id}/active', async () => {
  const click = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  await click.click(within(rowOf('Minh Le')).getByRole('button', { name: 'Block' }))
  await waitFor(() => expect(patches).toContainEqual({ url: '/users/u2/active', body: { isActive: false } }))

  await click.click(within(rowOf('Hoa Vo')).getByRole('button', { name: 'Unblock' }))
  await waitFor(() => expect(patches).toContainEqual({ url: '/users/u3/active', body: { isActive: true } }))
})

test('changes a role with PATCH /users/{id}/role', async () => {
  const click = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  await click.click(screen.getByRole('combobox', { name: 'Role of Minh Le' }))
  await click.click(await screen.findByRole('option', { name: 'Admin' }))

  await waitFor(() => expect(patches).toContainEqual({ url: '/users/u2/role', body: { role: 'Admin' } }))
})

async function fillNewUser(typing: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await typing.click(screen.getByRole('button', { name: 'New user' }))
  const dialog = await screen.findByRole('dialog')
  await typing.type(within(dialog).getByLabelText('Full name'), 'Bao Nguyen')
  await typing.type(within(dialog).getByLabelText('Email'), email)
  await typing.type(within(dialog).getByLabelText('Password'), password)
  await typing.click(within(dialog).getByRole('button', { name: 'Create user' }))
  return dialog
}

test('creates a user with POST /users and closes the dialog', async () => {
  const typing = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  await fillNewUser(typing, 'bao@example.com', 'longenough1')

  await waitFor(() =>
    expect(patches).toContainEqual({
      url: '/users',
      body: { fullName: 'Bao Nguyen', email: 'bao@example.com', role: 'Attendee', password: 'longenough1' },
    }),
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('rejects a short password without calling the API', async () => {
  const typing = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  const dialog = await fillNewUser(typing, 'bao@example.com', 'short')

  expect(await within(dialog).findByText('Password must be at least 8 characters')).toBeInTheDocument()
  expect(patches).toEqual([])
})

test('shows the 409 message under the email field and keeps the dialog open', async () => {
  server.use(
    http.post(`${API_URL}/users`, () =>
      HttpResponse.json({ message: 'An account with this email already exists.' }, { status: 409 }),
    ),
  )
  const typing = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')

  const dialog = await fillNewUser(typing, 'minh@example.com', 'longenough1')

  expect(await within(dialog).findByText('An account with this email already exists.')).toBeInTheDocument()
})

test('creates a user with the role picked in the dialog', async () => {
  const typing = userEvent.setup()
  renderPage()
  await screen.findByText('Minh Le')
  await typing.click(screen.getByRole('button', { name: 'New user' }))
  const dialog = await screen.findByRole('dialog')
  await typing.type(within(dialog).getByLabelText('Full name'), 'Bao Nguyen')
  await typing.type(within(dialog).getByLabelText('Email'), 'bao@example.com')
  await typing.type(within(dialog).getByLabelText('Password'), 'longenough1')

  await typing.click(within(dialog).getByRole('combobox', { name: 'Role' }))
  await typing.click(await screen.findByRole('option', { name: 'Organizer' }))
  await typing.click(within(dialog).getByRole('button', { name: 'Create user' }))

  await waitFor(() =>
    expect(patches).toContainEqual({
      url: '/users',
      body: { fullName: 'Bao Nguyen', email: 'bao@example.com', role: 'Organizer', password: 'longenough1' },
    }),
  )
})
