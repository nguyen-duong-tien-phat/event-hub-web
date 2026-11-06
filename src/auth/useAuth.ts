import { createContext, useContext } from 'react'
import type { SessionUser } from '@/api/types'

export interface AuthState {
  user: SessionUser | null
  loading: boolean // true while a stored session is being restored
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
