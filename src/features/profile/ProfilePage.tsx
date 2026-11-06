import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/auth'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { ProfileCard } from '@/features/users/ProfileCard'
import { UserActivity } from '@/features/users/UserActivity'

// The signed-in user's own profile. No role or block controls. An Organizer also sees their numbers, but not the events table.
export function ProfilePage() {
  const query = useQuery({ queryKey: ['me'], queryFn: getMe })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My profile" />
      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load your profile</AlertTitle>
          <AlertDescription>
            {describeError(query.error)}{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {query.data && <ProfileCard user={query.data} />}
      {query.data?.role === 'Organizer' && (
        <UserActivity userId={query.data.id} name={query.data.fullName} role={query.data.role} showEvents={false} />
      )}
    </div>
  )
}
