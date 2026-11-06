import { ROLES, type Role, type UserDto } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function RoleSelect({ user, disabled, onChange }: { user: UserDto; disabled: boolean; onChange: (role: Role) => void }) {
  return (
    <Select value={user.role} disabled={disabled} onValueChange={(role) => onChange(role as Role)}>
      <SelectTrigger aria-label={`Role of ${user.fullName}`} className="h-9 min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
