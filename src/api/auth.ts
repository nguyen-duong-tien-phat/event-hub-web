import { api, clearSession, setSession, storedRefreshToken } from './client'
import type { AuthResponse } from './types'

export async function login(email: string, password: string) {
  setSession(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }))
}

export async function logout() {
  const refreshToken = storedRefreshToken()
  clearSession() // sign out in the UI first; revoking on the server is best effort
  if (refreshToken) await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {})
}
