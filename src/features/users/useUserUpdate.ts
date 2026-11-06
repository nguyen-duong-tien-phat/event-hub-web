import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Role, UserDto } from '@/api/types'
import { changeRole, setActive } from '@/api/users'
import { describeError } from '@/lib/errors'

export type Change = { role: Role } | { isActive: boolean }

// Role change and block/unblock, shared by the Users table and the user detail page.
export function useUserUpdate() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ user, change }: { user: UserDto; change: Change }) =>
      'role' in change ? changeRole(user.id, change.role) : setActive(user.id, change.isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => toast.error(describeError(e)),
  })

  return {
    busyId: mutation.isPending ? mutation.variables.user.id : undefined,
    update: (user: UserDto, change: Change) =>
      mutation.mutate(
        { user, change },
        {
          onSuccess: () =>
            toast.success(
              'role' in change
                ? `${user.fullName} is now ${change.role}`
                : `${user.fullName} was ${change.isActive ? 'unblocked' : 'blocked'}`,
            ),
        },
      ),
  }
}
