import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Info, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listUsers } from '@/api/users'
import type { UserDto } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeError } from '@/lib/errors'
import { initials } from '@/lib/initials'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { CreateUserDialog } from './CreateUserDialog'
import { BlockButton, RoleSelect, StatusBadge } from './UserControls'
import { useUserUpdate, type Change } from './useUserUpdate'

const PAGE_SIZE = 10
type Status = 'all' | 'active' | 'blocked'

export function UsersPage() {
  const { user: me } = useAuth()
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

  const { update, busyId } = useUserUpdate()

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
                  onChange={(change) => update(u, change)}
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

// Clicks on these keep their own meaning; anywhere else on the row opens the user.
const INTERACTIVE = 'a,button,input,select,[role=combobox],[role=listbox],[role=option]'

function UserRow({ user, isMe, busy, onChange }: { user: UserDto; isMe: boolean; busy: boolean; onChange: (c: Change) => void }) {
  const navigate = useNavigate()
  return (
    <TableRow
      className="cursor-pointer"
      onClick={(e) => {
        // The role menu is portalled but its clicks still bubble here through React, so test the DOM target.
        if (!(e.target as HTMLElement).closest(INTERACTIVE)) void navigate(`/users/${user.id}`)
      }}
    >
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {initials(user.fullName)}
          </span>
          <div className="leading-snug">
            <Link to={`/users/${user.id}`} className="font-medium hover:underline">
              {user.fullName}
              {isMe && ' (you)'}
            </Link>
            <div className="text-[13px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <RoleSelect user={user} disabled={isMe || busy} onChange={(role) => onChange({ role })} />
      </TableCell>
      <TableCell className="px-4 py-3">
        <StatusBadge active={user.isActive} />
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <BlockButton user={user} disabled={isMe || busy} onClick={() => onChange({ isActive: !user.isActive })} />
      </TableCell>
    </TableRow>
  )
}
