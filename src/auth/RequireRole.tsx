import { Navigate, Outlet } from 'react-router'
import type { Role } from '@/api/types'
import { Button } from '@/components/ui/button'
import { useAuth } from './useAuth'

// Hides pages for convenience only: the API decides who may do what.
// redirectTo: send a signed-in user without the role there (an Organizer who opens /users goes to the events page)
// instead of showing "No access".
export function RequireRole({ roles, redirectTo }: { roles: Role[]; redirectTo?: string }) {
  const { user, logout } = useAuth()
  if (user && roles.includes(user.role)) return <Outlet />
  if (user && redirectTo) return <Navigate to={redirectTo} replace />

  return (
    <main className="flex flex-col items-start gap-3 p-8">
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="text-sm text-muted-foreground">This page is for {roles.join(' and ')} accounts.</p>
      <Button variant="outline" onClick={() => void logout()}>
        Sign out
      </Button>
    </main>
  )
}
