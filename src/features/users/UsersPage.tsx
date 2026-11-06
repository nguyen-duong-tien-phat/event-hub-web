import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { changeRole, listUsers, setActive } from '@/api/users'
import { ROLES, type Role, type UserDto } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeError } from '@/lib/errors'
import { initials } from '@/lib/initials'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { CreateUserDialog } from './CreateUserDialog'

const PAGE_SIZE = 10
type Status = 'all' | 'active' | 'blocked'

type Change = { id: string } & ({ role: Role } | { isActive: boolean })

export function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(searchInput.trim(), 300)
  const isActive = status === 'all' ? undefined : status === 'active'

  const users = useQuery({
    queryKey: ['users', search, isActive, page],
    queryFn: () => listUsers({ search, isActive, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const update = useMutation({
    mutationFn: (change: Change) => ('role' in change ? changeRole(change.id, change.role) : setActive(change.id, change.isActive)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => toast.error(describeError(e)),
  })
  const busyId = update.isPending ? update.variables.id : undefined

  const data = users.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" actions={<CreateUserDialog />} />

      <Alert className="border-brand/25 bg-brand-soft">
        <Info className="text-brand" />
        <AlertTitle>Changes are not instant</AlertTitle>
        <AlertDescription>
          A role change or a blocked account takes effect when the user's access token is next refreshed (up to 15
          minutes).
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-60 flex-1">
          <Search aria-hidden="true" className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search users by name or email"
            placeholder="Search name or email…"
            className="h-9 pl-8.5"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <select
          aria-label="Status"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status)
            setPage(1)
          }}
        >
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {users.isError && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load users</AlertTitle>
          <AlertDescription>
            {describeError(users.error)}{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => void users.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4">User</TableHead>
                <TableHead className="h-10 px-4">Role</TableHead>
                <TableHead className="h-10 px-4">Status</TableHead>
                <TableHead className="h-10 px-4 text-right">Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No users match.
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isMe={u.id === me?.id}
                  busy={busyId === u.id}
                  onChange={(change) =>
                    update.mutate(change, {
                      onSuccess: () =>
                        toast.success('role' in change ? `${u.fullName} is now ${change.role}` : `${u.fullName} was ${change.isActive ? 'unblocked' : 'blocked'}`),
                    })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          noun="users"
          onPageChange={setPage}
        />
      )}
      <p className="text-[13px] text-muted-foreground">
        You cannot block yourself or lower your own role, so one admin always remains.
      </p>
    </div>
  )
}

function UserRow({ user, isMe, busy, onChange }: { user: UserDto; isMe: boolean; busy: boolean; onChange: (c: Change) => void }) {
  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {initials(user.fullName)}
          </span>
          <div className="leading-snug">
            <div className="font-medium">
              {user.fullName}
              {isMe && ' (you)'}
            </div>
            <div className="text-[13px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <Select value={user.role} disabled={isMe || busy} onValueChange={(role) => onChange({ id: user.id, role: role as Role })}>
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
      </TableCell>
      <TableCell className="px-4 py-3">
        {user.isActive ? (
          <Badge className="bg-success-soft text-success">Active</Badge>
        ) : (
          <Badge variant="destructive">Blocked</Badge>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          className={user.isActive ? 'h-8 text-destructive' : 'h-8'}
          disabled={isMe || busy}
          onClick={() => onChange({ id: user.id, isActive: !user.isActive })}
        >
          {user.isActive ? 'Block' : 'Unblock'}
        </Button>
      </TableCell>
    </TableRow>
  )
}
