import { CalendarDays, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/initials'
import { cn } from '@/lib/utils'
import { PageHeaderSlot } from './pageHeaderSlot'

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-foreground/80 hover:bg-muted',
    isActive && 'bg-muted text-foreground',
  )

function NavItem({ to, icon: Icon, children }: { to: string; icon: LucideIcon; children: string }) {
  return (
    <NavLink to={to} className={link}>
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </NavLink>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)

  return (
    // From md up the window is the frame: sidebar and header stay put and only <main> scrolls.
    // Narrower, the sidebar stacks on top and the whole page scrolls.
    <div className="flex min-h-svh flex-col md:h-svh md:flex-row md:overflow-hidden">
      <aside className="flex flex-col gap-4 border-b bg-sidebar px-3 py-4 md:w-60 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex min-h-8 items-center gap-2 px-2.5">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
          >
            E
          </span>
          <span className="text-[15px] font-semibold">EventHub</span>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <NavItem to="/events" icon={CalendarDays}>
            Events
          </NavItem>
          {user?.role === 'Admin' && (
            <NavItem to="/users" icon={Users}>
              Users
            </NavItem>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
            >
              {initials(user?.fullName ?? '')}
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-medium">{user?.fullName}</div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
        <header
          ref={setHeaderSlot}
          className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-8"
        />
        <main className="min-w-0 flex-1 p-8 md:overflow-y-auto">
          <PageHeaderSlot.Provider value={headerSlot}>
            <Outlet />
          </PageHeaderSlot.Provider>
        </main>
      </div>
    </div>
  )
}
