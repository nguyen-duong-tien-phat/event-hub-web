import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { API_URL, clearSession, setSession } from './client'
import { uploadPoster, validatePoster } from './uploads'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearSession()
})
afterAll(() => server.close())

const file = (type: string, bytes = 10) => new File([new ArrayBuffer(bytes)], 'poster', { type })

test('the poster goes to storage with its own Content-Type and no Authorization header', async () => {
  setSession({ id: 'u1', email: 'a@b.c', fullName: 'Ann', role: 'Admin', token: 'secret-access', refreshToken: 'r1' })
  let askedFor: unknown
  let apiAuth: string | null = null
  let put: Headers | undefined
  server.use(
    http.post(`${API_URL}/events/image-upload`, async ({ request }) => {
      askedFor = await request.json()
      apiAuth = request.headers.get('Authorization')
      return HttpResponse.json({ uploadUrl: 'http://storage.test/put/poster', fileUrl: 'http://storage.test/events/images/p.png' })
    }),
    http.put('http://storage.test/put/poster', ({ request }) => {
      put = request.headers
      return new HttpResponse(null, { status: 200 })
    }),
  )

  const fileUrl = await uploadPoster(file('image/png'))

  expect(fileUrl).toBe('http://storage.test/events/images/p.png')
  expect(askedFor).toEqual({ contentType: 'image/png' })
  expect(apiAuth).toBe('Bearer secret-access') // the API call is authorised ...
  expect(put?.get('Content-Type')).toBe('image/png')
  expect(put?.has('Authorization')).toBe(false) // ... the storage call is not
})

test.each([
  ['image/gif', 10, 'Use a JPEG, PNG or WebP image.'],
  ['image/png', 6 * 1024 * 1024, 'The image must be 5 MB or smaller.'],
])('refuses a %s of %i bytes', (type, bytes, message) => {
  expect(validatePoster(file(type, bytes))).toBe(message)
})

test('accepts a small JPEG, PNG or WebP', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(validatePoster(file(type))).toBeNull()
})
