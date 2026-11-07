import { CalendarDays, PanelLeft, Ticket, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/initials'
import { cn } from '@/lib/utils'
import { PageFooterSlot, PageHeaderSlot } from './pageHeaderSlot'

const SIDEBAR_KEY = 'eventhub.sidebarOpen'

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
  // The choice is remembered per browser; storage can be blocked, then the sidebar simply starts open.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== 'false'
    } catch {
      return true
    }
  })
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    try {
      localStorage.setItem(SIDEBAR_KEY, String(!sidebarOpen))
    } catch {
      /* not remembered */
    }
  }
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null)

  return (
    // From md up the frame is a fixed box covering the window (the same in every browser, unlike a vh or % height chain): sidebar and header stay put and only <main> scrolls.
    // Narrower, the sidebar stacks on top and the whole page scrolls.
    <div className="flex min-h-dvh flex-col md:fixed md:inset-0 md:min-h-0 md:flex-row md:overflow-hidden">
      <aside id="sidebar" hidden={!sidebarOpen} className="flex flex-col gap-4 border-b bg-sidebar px-3 py-4 md:w-60 md:shrink-0 md:overflow-hidden md:border-r md:border-b-0">
        <div className="flex min-h-8 items-center gap-2 px-2.5">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
          >
            E
          </span>
          <span className="text-[15px] font-semibold">EventHub</span>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-0.5 md:min-h-0 md:flex-1 md:overflow-y-auto">
          {user?.role === 'Admin' && (
            <NavItem to="/users" icon={Users}>
              Users
            </NavItem>
          )}
          <NavItem to="/events" icon={CalendarDays}>
            Events
          </NavItem>
          <NavItem to="/bookings" icon={Ticket}>
            Bookings
          </NavItem>
        </nav>
        <div className="flex shrink-0 flex-col gap-3 border-t pt-3">
          <div className="flex items-center gap-1">
            <NavLink
              to="/profile"
              aria-label={`My profile, ${user?.fullName}`}
              className={({ isActive }) =>
                cn('flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted', isActive && 'bg-muted')
              }
            >
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
              >
                {initials(user?.fullName ?? '')}
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium">{user?.fullName}</div>
                <div className="text-xs text-muted-foreground">{user?.role}</div>
              </div>
            </NavLink>
            <ThemeToggle />
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b pl-4 pr-8">
          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            onClick={toggleSidebar}
          >
            <PanelLeft aria-hidden="true" />
          </Button>
          <header ref={setHeaderSlot} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3" />
        </div>
        <main className="min-w-0 flex-1 p-8 md:overflow-y-auto">
          <PageHeaderSlot.Provider value={headerSlot}>
            <PageFooterSlot.Provider value={footerSlot}>
              <Outlet />
            </PageFooterSlot.Provider>
          </PageHeaderSlot.Provider>
        </main>
        {/* Docked under the scrolling content; hidden while no page puts anything in it. */}
        <footer ref={setFooterSlot} className="flex shrink-0 justify-end gap-2 border-t bg-background px-8 py-3 empty:hidden" />
      </div>
    </div>
  )
}
