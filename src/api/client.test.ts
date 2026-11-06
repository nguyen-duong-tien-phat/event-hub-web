import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { api, ApiError, API_URL, clearSession, setSession, storedRefreshToken, subscribe } from './client'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const user = { id: 'u1', email: 'a@b.c', fullName: 'Ann', role: 'Admin' as const }
beforeEach(() => setSession({ ...user, token: 'old', refreshToken: 'r1' }))
afterEach(() => clearSession())

test('concurrent 401s share one refresh and each request is retried', async () => {
  let refreshCalls = 0
  server.use(
    http.get(`${API_URL}/things`, ({ request }) =>
      request.headers.get('Authorization') === 'Bearer new'
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json({ message: 'expired' }, { status: 401 }),
    ),
    http.post(`${API_URL}/auth/refresh`, async () => {
      refreshCalls++
      await new Promise((r) => setTimeout(r, 20))
      return HttpResponse.json({ ...user, token: 'new', refreshToken: 'r2' })
    }),
  )

  const results = await Promise.all([api('/things'), api('/things'), api('/things')])

  expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  expect(refreshCalls).toBe(1)
  expect(storedRefreshToken()).toBe('r2')
})

test('a failed refresh ends the session and reports the user as signed out', async () => {
  server.use(
    http.get(`${API_URL}/things`, () => HttpResponse.json({ message: 'expired' }, { status: 401 })),
    http.post(`${API_URL}/auth/refresh`, () =>
      HttpResponse.json({ message: 'Session expired. Please log in again.' }, { status: 401 }),
    ),
  )
  const seen = vi.fn()
  const unsubscribe = subscribe(seen)

  await expect(api('/things')).rejects.toMatchObject({ status: 401 })

  unsubscribe()
  expect(seen).toHaveBeenLastCalledWith(null)
  expect(storedRefreshToken()).toBeNull()
})

test.each([
  ['{message}', { message: 'Event has bookings' }, 409, 'Event has bookings', undefined],
  ['{message, traceId}', { message: 'Something went wrong.', traceId: 't-1' }, 500, 'Something went wrong.', 't-1'],
  ['validation', { title: 'One or more validation errors occurred.', errors: { Title: ['Title is required'] } }, 400, 'Title is required', undefined],
])('turns the %s error body into an ApiError', async (_name, body, status, message, traceId) => {
  server.use(http.get(`${API_URL}/things`, () => HttpResponse.json(body, { status })))

  const error = await api('/things').catch((e) => e)

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status, message, traceId })
})

test('login does not try to refresh on 401', async () => {
  let refreshCalls = 0
  server.use(
    http.post(`${API_URL}/auth/login`, () => HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })),
    http.post(`${API_URL}/auth/refresh`, () => {
      refreshCalls++
      return HttpResponse.json({}, { status: 401 })
    }),
  )

  await expect(api('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
    message: 'Invalid email or password',
  })
  expect(refreshCalls).toBe(0)
})

test('a refresh uses the token stored at that moment, since another tab may have rotated it', async () => {
  let sent: unknown
  server.use(
    http.get(`${API_URL}/things`, ({ request }) =>
      request.headers.get('Authorization') === 'Bearer new'
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json({ message: 'expired' }, { status: 401 }),
    ),
    http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
      sent = await request.json()
      return HttpResponse.json({ ...user, token: 'new', refreshToken: 'r3' })
    }),
  )
  localStorage.setItem('eventhub.refreshToken', 'r-from-other-tab')

  await api('/things')

  expect(sent).toEqual({ refreshToken: 'r-from-other-tab' })
})

test('signing out in another tab signs this tab out', () => {
  const seen = vi.fn()
  const unsubscribe = subscribe(seen)

  localStorage.removeItem('eventhub.refreshToken')
  window.dispatchEvent(new StorageEvent('storage', { key: 'eventhub.refreshToken', newValue: null }))

  unsubscribe()
  expect(seen).toHaveBeenLastCalledWith(null)
})
