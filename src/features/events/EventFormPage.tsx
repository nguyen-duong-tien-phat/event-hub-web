import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageUp, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { createEvent, getEvent, listCategories, updateEvent, type EventDetail } from '@/api/events'
import { POSTER_TYPES, uploadPoster, validatePoster } from '@/api/uploads'
import { useAuth } from '@/auth/useAuth'
import { SearchSelect } from '@/components/SearchSelect'
import { PageFooter } from '@/components/PageFooter'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fromLocalInput } from '@/lib/dates'
import { useGoBack } from '@/lib/useGoBack'
import { describeError } from '@/lib/errors'
import { useOrganizerSearch } from '@/features/users/useOrganizerSearch'
import { buildPatch, cleanHighlights, toFormValues, type EventFormValues } from './eventDiff'

const schema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(200, 'At most 200 characters'),
  category: z.string().trim().min(1, 'Enter a category').max(50, 'At most 50 characters'),
  location: z.string().trim().min(1, 'Enter a venue').max(300, 'At most 300 characters'),
  startsAt: z.string().min(1, 'Choose a start time'),
  description: z.string().max(2000, 'At most 2000 characters'),
  highlights: z.array(z.object({ text: z.string() })),
})

const empty: EventFormValues = { title: '', category: '', location: '', startsAt: '', description: '', highlights: [] }

export function EventFormPage() {
  const { id } = useParams()
  const event = useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id!), enabled: !!id })
  const title = id ? 'Edit event' : 'New event'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} back={id ? { to: `/events/${id}`, label: 'Event' } : { to: '/events', label: 'Events' }} />
      {id && event.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the event</AlertTitle>
          <AlertDescription>{describeError(event.error)}</AlertDescription>
        </Alert>
      ) : id && !event.data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <EventForm event={event.data} />
      )}
    </div>
  )
}

function EventForm({ event }: { event?: EventDetail }) {
  const navigate = useNavigate()
  // Cancel and a saved edit return to the page the user came from (the event or the list); opened directly, to the event or the list.
  const { goBack } = useGoBack(event ? `/events/${event.id}` : '/events')
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const categories = useQuery({ queryKey: ['event-categories'], queryFn: listCategories })
  // Only an admin creating an event can pick whose it is ('' is the admin's own); editing never changes the organizer.
  const canPickOrganizer = !event && user?.role === 'Admin'
  const [organizerId, setOrganizerId] = useState('')
  const organizerSearch = useOrganizerSearch(canPickOrganizer)
  const [poster, setPoster] = useState<File | null>(null)
  const [posterError, setPosterError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: event ? toFormValues(event) : empty,
  })
  const highlights = useFieldArray({ control, name: 'highlights' })
  const preview = useMemo(() => (poster ? URL.createObjectURL(poster) : null), [poster])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  function pickPoster(file?: File) {
    if (!file) return
    const problem = validatePoster(file)
    setPosterError(problem ?? undefined)
    if (!problem) setPoster(file)
  }

  async function onSubmit(values: EventFormValues) {
    setFormError(undefined)
    if (!event && !poster) return setPosterError('Choose a poster for the event.') // the API requires an imageUrl
    try {
      const imageUrl = poster ? await uploadPoster(poster) : undefined // the upload URL lives 5 minutes, so upload last
      if (event) {
        const patch = buildPatch(event, values, imageUrl)
        if (Object.keys(patch).length > 0) await updateEvent(event.id, patch)
      } else {
        await createEvent({
          ...values,
          startsAt: fromLocalInput(values.startsAt),
          highlights: cleanHighlights(values.highlights),
          imageUrl: imageUrl!,
          ...(canPickOrganizer && organizerId ? { organizerId } : {}),
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      await queryClient.invalidateQueries({ queryKey: ['event', event?.id] })
      toast.success(event ? 'Event saved' : 'Event created')
      if (event) goBack()
      else void navigate('/events')
    } catch (e) {
      // ASP.NET validation names fields in PascalCase ("StartsAt"); show each under its field when we have it.
      const rest: string[] = []
      if (e instanceof ApiError && e.fieldErrors) {
        for (const [key, messages] of Object.entries(e.fieldErrors)) {
          const name = key.charAt(0).toLowerCase() + key.slice(1)
          if (name in empty) setError(name as keyof EventFormValues, { message: messages[0] })
          else rest.push(messages[0])
        }
      }
      setFormError(rest.length ? rest.join(' ') : e instanceof ApiError && e.fieldErrors ? undefined : describeError(e))
    }
  }

  const shownPoster = preview ?? event?.imageUrl
  const field = 'flex flex-col gap-1.5'
  const textInput = 'h-9'

  return (
    <form
      id="event-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto w-full max-w-180 rounded-xl border"
    >
      <div className="flex flex-col gap-5 p-6">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {canPickOrganizer && (
          <div className={field}>
            <Label htmlFor="organizer">Organizer</Label>
            <SearchSelect
              id="organizer"
              ariaLabel="Organizer"
              className="w-full"
              value={organizerId}
              onChange={setOrganizerId}
              options={[{ value: '', label: `Me (${user?.fullName})` }, ...organizerSearch.options]}
              searchPlaceholder="Search organizers…"
              onSearchChange={organizerSearch.onSearchChange}
              loading={organizerSearch.loading}
            />
          </div>
        )}
        <div className={field}>
          <Label htmlFor="title">Title</Label>
          <Input id="title" className={textInput} aria-invalid={!!errors.title} {...register('title')} />
          {errors.title && <p className="text-[13px] text-destructive">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          <div className={field}>
            <Label htmlFor="category">Category</Label>
            {/* Free text with suggestions: the API only lists categories that have an upcoming event. */}
            <Input
              id="category"
              list="category-options"
              className={textInput}
              aria-invalid={!!errors.category}
              {...register('category')}
            />
            <datalist id="category-options">
              {categories.data?.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && <p className="text-[13px] text-destructive">{errors.category.message}</p>}
          </div>
          <div className={field}>
            <Label htmlFor="location">Venue</Label>
            <Input id="location" className={textInput} aria-invalid={!!errors.location} {...register('location')} />
            {errors.location && <p className="text-[13px] text-destructive">{errors.location.message}</p>}
          </div>
        </div>

        <div className={field}>
          <Label htmlFor="startsAt">Starts at</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            className={`${textInput} max-w-70`}
            aria-invalid={!!errors.startsAt}
            {...register('startsAt')}
          />
          {errors.startsAt ? (
            <p className="text-[13px] text-destructive">{errors.startsAt.message}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">Shown in your time zone. Must be at least one day from now.</p>
          )}
        </div>

        <div className={field}>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} aria-invalid={!!errors.description} {...register('description')} />
          {errors.description && <p className="text-[13px] text-destructive">{errors.description.message}</p>}
        </div>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Highlights</legend>
          {highlights.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <Input
                aria-label={`Highlight ${i + 1}`}
                className={`${textInput} flex-1`}
                {...register(`highlights.${i}.text`)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label={`Remove highlight ${i + 1}`}
                onClick={() => highlights.remove(i)}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-8 self-start" onClick={() => highlights.append({ text: '' })}>
            <Plus />
            Add highlight
          </Button>
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Poster</span>
          {shownPoster && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <img src={shownPoster} alt="" className="size-12 shrink-0 rounded-lg bg-brand-soft object-cover" />
              <div className="min-w-0 flex-1 leading-snug">
                <div className="truncate font-medium">{poster ? poster.name : 'Current poster'}</div>
                <div className="text-[13px] text-muted-foreground">{poster ? 'Uploaded when you save' : 'Choose a file below to replace it'}</div>
              </div>
              {poster && (
                <Button type="button" variant="outline" size="sm" className="h-8 text-destructive" onClick={() => setPoster(null)}>
                  Remove
                </Button>
              )}
            </div>
          )}
          <label className="relative flex flex-col items-center gap-1 rounded-lg border border-dashed border-muted-foreground/60 bg-sidebar p-6 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <ImageUp aria-hidden="true" className="size-6 text-muted-foreground" />
            <span className="font-medium">Choose a file or drag it here</span>
            <span className="text-[13px] text-muted-foreground">JPEG, PNG or WebP, up to 5 MB</span>
            <input
              type="file"
              aria-label="Poster file"
              accept={POSTER_TYPES.join(',')}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onChange={(e) => {
                pickPoster(e.target.files?.[0])
                e.target.value = '' // the same file can be chosen again after removing it
              }}
            />
          </label>
          {posterError && <p className="text-[13px] text-destructive">{posterError}</p>}
        </div>
      </div>

      {/* The buttons live in the layout's footer bar; `form` ties Save to this form from there. */}
      <PageFooter>
        <Button type="button" variant="outline" size="lg" onClick={goBack}>
          Cancel
        </Button>
        <Button type="submit" form="event-form" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : event ? 'Save changes' : 'Create event'}
        </Button>
      </PageFooter>
    </form>
  )
}
