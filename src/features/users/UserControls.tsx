import { ROLES, type Role, type UserDto } from '@/api/types'
import { SearchSelect } from '@/components/SearchSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }))

export function RoleSelect({ user, disabled, onChange }: { user: UserDto; disabled: boolean; onChange: (role: Role) => void }) {
  return (
    <SearchSelect
      ariaLabel={`Role of ${user.fullName}`}
      className="min-w-32"
      value={user.role}
      disabled={disabled}
      onChange={(role) => onChange(role as Role)}
      options={ROLE_OPTIONS}
      searchPlaceholder="Search roles…"
    />
  )
}

export function BlockButton({ user, disabled, onClick, className = 'h-8' }: { user: UserDto; disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`${className} ${user.isActive ? 'text-destructive' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {user.isActive ? 'Block' : 'Unblock'}
    </Button>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return active ? <Badge className="bg-success-soft text-success">Active</Badge> : <Badge variant="destructive">Blocked</Badge>
}
