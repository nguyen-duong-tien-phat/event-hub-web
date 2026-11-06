import type { Role, UserDto } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/lib/initials'
import { StatusBadge } from './UserControls'

const roleBadge: Record<Role, string> = {
  Admin: 'bg-primary text-primary-foreground',
  Organizer: 'bg-brand-soft text-brand',
  Attendee: 'bg-secondary text-secondary-foreground',
}

export function ProfileCard({ user }: { user: UserDto }) {
  return (
    <section aria-label="Profile" className="flex flex-wrap items-center gap-5 rounded-xl border p-6">
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand"
      >
        {initials(user.fullName)}
      </span>
      <div className="min-w-60 flex-1 leading-snug">
        <div className="text-base font-semibold">{user.fullName}</div>
        <div className="text-muted-foreground">{user.email}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={roleBadge[user.role]}>{user.role}</Badge>
        <StatusBadge active={user.isActive} />
        <span className="ml-2 text-[13px] text-muted-foreground">
          Member since{' '}
          {new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </section>
  )
}
