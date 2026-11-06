import type { AuthResponse, SessionUser } from './types'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// shortcut: the refresh token lives in localStorage, so a new tab or a restart stays signed in. Any script on the page
// can read it; move it to an httpOnly cookie if the API ever sets one.
const REFRESH_KEY = 'eventhub.refreshToken'

export class ApiError extends Error {
  status: number // 0 when the server could not be reached
  traceId?: string
  fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, extra: { traceId?: string; fieldErrors?: Record<string, string[]> } = {}) {
    super(message)
    this.status = status
    this.traceId = extra.traceId
    this.fieldErrors = extra.fieldErrors
  }
}

let accessToken: string | null = null
let refreshing: Promise<void> | null = null
const listeners = new Set<(user: SessionUser | null) => void>()

export function subscribe(listener: (user: SessionUser | null) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const storedRefreshToken = () => localStorage.getItem(REFRESH_KEY)

export function setSession({ token, refreshToken, ...user }: AuthResponse) {
  accessToken = token
  localStorage.setItem(REFRESH_KEY, refreshToken)
  listeners.forEach((l) => l(user))
}

export function clearSession() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
  listeners.forEach((l) => l(null))
}

const FALLBACK: Record<number, string> = {
  403: "You don't have permission to do that.",
  404: 'Not found.',
}

// Turns the API's three error bodies ({message}, {message, traceId}, {title, errors}) into one.
async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: string
    traceId?: string
    title?: string
    errors?: Record<string, string[]>
  } | null
  const firstFieldError = body?.errors && Object.values(body.errors).flat()[0]
  return new ApiError(
    res.status,
    body?.message ?? firstFieldError ?? body?.title ?? FALLBACK[res.status] ?? `Request failed (${res.status}).`,
    { traceId: body?.traceId, fieldErrors: body?.errors },
  )
}

async function send(path: string, method: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }
}

// One shared request: a refresh token works once, and using it twice ends every session of the user.
export function refresh(): Promise<void> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

// Tabs share the stored refresh token and it works once, so they refresh one at a time (a Web Lock). The token is
// read inside the turn: a tab that waited uses what the other tab just stored, not the token that tab already spent.
const inTurn = <T>(fn: () => Promise<T>) => (navigator.locks ? navigator.locks.request('eventhub-refresh', fn) : fn())

function doRefresh() {
  return inTurn(async () => {
    const refreshToken = storedRefreshToken()
    if (!refreshToken) throw new ApiError(401, 'Session expired. Please log in again.')
    const res = await send('/auth/refresh', 'POST', { refreshToken }, null)
    if (!res.ok) {
      clearSession()
      throw await toError(res)
    }
    setSession(await res.json())
  })
}

// Another tab signed out (or its refresh failed and removed the token): leave this tab signed out too.
window.addEventListener('storage', (e) => {
  if ((e.key === REFRESH_KEY || e.key === null) && storedRefreshToken() === null && accessToken !== null) {
    accessToken = null
    listeners.forEach((l) => l(null))
  }
})

interface Options {
  method?: string
  body?: unknown
  auth?: boolean // false for calls that must not carry or refresh a session (login, logout)
}

export async function api<T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const usedToken = auth ? accessToken : null
  let res = await send(path, method, body, usedToken)
  if (res.status === 401 && auth && storedRefreshToken()) {
    // A request that failed while another was refreshing already has a new token to retry with.
    if (usedToken === accessToken) await refresh()
    res = await send(path, method, body, accessToken)
  }
  if (!res.ok) throw await toError(res)
  return res.status === 204 ? (undefined as T) : res.json()
}
