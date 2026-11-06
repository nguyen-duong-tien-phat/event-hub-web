import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { login, logout } from '@/api/auth'
import { refresh, storedRefreshToken, subscribe } from '@/api/client'
import type { SessionUser } from '@/api/types'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(() => storedRefreshToken() !== null)

  useEffect(() => {
    const unsubscribe = subscribe(setUser)
    // Restores the session after a reload; the refresh is shared, so StrictMode's second run is harmless.
    if (storedRefreshToken()) refresh().catch(() => {}).finally(() => setLoading(false))
    return unsubscribe
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
