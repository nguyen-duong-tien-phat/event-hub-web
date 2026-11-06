import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { ROLES } from '@/api/types'
import { createUser } from '@/api/users'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { describeError } from '@/lib/errors'

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name').max(200, 'At most 200 characters'),
  email: z.email('Enter a valid email'),
  role: z.enum(ROLES),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type Values = z.infer<typeof schema>
const defaults: Partial<Values> = { role: 'Attendee' }

export function CreateUserDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      reset()
      setError(undefined)
    }
  }

  async function onSubmit(values: Values) {
    setError(undefined)
    try {
      const created = await createUser(values)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${created.fullName} was created as ${created.role}`)
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFieldError('email', { message: e.message })
      else setError(describeError(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus aria-hidden="true" />
          New user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-4 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New user</DialogTitle>
          <DialogDescription>Creates an account and sets its role. Admins only.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="off" className="h-9" aria-invalid={!!errors.fullName} {...register('fullName')} />
            {errors.fullName && <p className="text-[13px] text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="off" className="h-9" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && (
              <p role="alert" className="text-[13px] text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role" className="h-9 w-full">
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
              )}
            />
            <p className="text-[13px] text-muted-foreground">Attendee by default. Only admins can create accounts.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="h-9"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-[13px] text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-[13px] text-muted-foreground">At least 8 characters. Share it with the user yourself.</p>
            )}
          </div>
          <DialogFooter className="-mx-6 -mb-6 border-t-0 bg-transparent px-6 pb-6">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
