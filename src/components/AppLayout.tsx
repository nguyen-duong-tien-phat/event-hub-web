import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-medium hover:bg-muted', isActive && 'bg-muted')

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">EventHub</span>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user?.fullName} <span className="text-muted-foreground">({user?.role})</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <nav aria-label="Main" className="flex gap-1 border-b p-2 md:w-48 md:flex-col md:border-r md:border-b-0">
          <NavLink to="/events" className={link}>
            Events
          </NavLink>
          {user?.role === 'Admin' && (
            <NavLink to="/users" className={link}>
              Users
            </NavLink>
          )}
        </nav>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
