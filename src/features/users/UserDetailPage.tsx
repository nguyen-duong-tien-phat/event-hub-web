import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { getUser } from '@/api/users'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { ProfileCard } from './ProfileCard'
import { BlockButton, RoleSelect } from './UserControls'
import { UserActivity } from './UserActivity'
import { useUserUpdate } from './useUserUpdate'

export function UserDetailPage() {
  const { id = '' } = useParams()
  const { user: me } = useAuth()
  const { update, busyId } = useUserUpdate()
  const query = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => getUser(id) })
  const user = query.data
  const isMe = !!user && user.id === me?.id
  const locked = isMe || busyId === id

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/users', label: 'Users' }}
        title={user ? `${user.fullName}${isMe ? ' (you)' : ''}` : 'User'}
        actions={
          user && (
            <div className="flex items-center gap-2">
              <RoleSelect user={user} disabled={locked} onChange={(role) => update(user, { role })} />
              <BlockButton user={user} disabled={locked} className="h-9" onClick={() => update(user, { isActive: !user.isActive })} />
            </div>
          )
        }
      />

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this user</AlertTitle>
          <AlertDescription>
            {describeError(query.error)}{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {user && (
        <>
          <ProfileCard user={user} />

          <UserActivity userId={user.id} name={user.fullName} role={user.role} />

          {isMe && (
            <p className="text-[13px] text-muted-foreground">
              You cannot block yourself or lower your own role, so one admin always remains.
            </p>
          )}
        </>
      )}
    </div>
  )
}
