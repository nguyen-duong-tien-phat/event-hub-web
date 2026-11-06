import { Outlet } from 'react-router'
import type { Role } from '@/api/types'
import { Button } from '@/components/ui/button'
import { useAuth } from './useAuth'

// Hides pages for convenience only: the API decides who may do what.
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, logout } = useAuth()
  if (user && roles.includes(user.role)) return <Outlet />

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
