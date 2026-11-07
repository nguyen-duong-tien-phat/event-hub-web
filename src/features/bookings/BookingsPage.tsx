import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { cancelBooking, listManagedBookings, type Booking, type BookingStatus } from '@/api/bookings'
import { getEvent, listEvents } from '@/api/events'
import { useAuth } from '@/auth/useAuth'
import { BookingsTable } from '@/components/BookingsTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { CursorPagination } from '@/components/Pagination'
import { SearchSelect } from '@/components/SearchSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { describeError } from '@/lib/errors'
import { useCursorStack } from '@/lib/useCursorStack'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

const PAGE_SIZE = 10
const TABS: ('All' | BookingStatus)[] = ['All', 'Confirmed', 'Pending', 'Cancelled']

// All events by default, or one event; the choice lives in ?event= so Back and reloads keep it.
const ALL = 'all'

export function BookingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const pages = useCursorStack()
  const [toCancel, setToCancel] = useState<Booking | null>(null)

  // An Organizer picks among their own events, an Admin among all. The API searches by title, 20 at a time.
  const organizerId = user?.role === 'Organizer' ? user.id : undefined
  const [eventText, setEventText] = useState('')
  const eventSearch = useDebouncedValue(eventText.trim(), 300)
  const events = useQuery({
    queryKey: ['events', 'picker', organizerId, eventSearch],
    queryFn: () => listEvents({ search: eventSearch, category: '', sort: 'Newest', organizerId, page: 1, pageSize: 20 }),
    placeholderData: keepPreviousData,
  })
  const eventId = params.get('event') ?? ALL
  // The chosen event may be outside the latest results, so its title is fetched to stay on the button.
  const options = [{ value: ALL, label: 'All events' }, ...(events.data?.items ?? []).map((e) => ({ value: e.id, label: e.title }))]
  const listed = options.some((o) => o.value === eventId)
  const chosen = useQuery({ queryKey: ['event', eventId], queryFn: () => getEvent(eventId), enabled: eventId !== ALL && events.isSuccess && !listed })
  if (chosen.data && !listed) options.unshift({ value: eventId, label: chosen.data.title })

  const status = tab === 'All' ? undefined : tab
  const bookings = useQuery({
    queryKey: ['events', 'bookings', 'managed', eventId, status, pages.cursor],
    queryFn: () => listManagedBookings({ eventId: eventId === ALL ? undefined : eventId, status, cursor: pages.cursor, page: 1, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const cancel = useMutation({
    mutationFn: (b: Booking) => cancelBooking(b.id),
    onSuccess: async () => {
      setToCancel(null)
      toast.success('Booking cancelled')
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (e) => {
      setToCancel(null)
      toast.error(describeError(e))
    },
  })

  const failure = bookings.error
  const data = bookings.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bookings" />

      {failure && (
        <Alert variant="destructive">
          <AlertTitle>Could not load bookings</AlertTitle>
          <AlertDescription>{describeError(failure)}</AlertDescription>
        </Alert>
      )}

      {(
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="event" className="text-sm font-medium">
              Event
            </label>
            <SearchSelect
              id="event"
              ariaLabel="Event"
              className="max-w-80 min-w-0 flex-[0_1_20rem]"
              value={eventId}
              onChange={(v) => {
                setParams(v === ALL ? {} : { event: v })
                pages.reset()
              }}
              options={options}
              searchPlaceholder="Search events…"
              onSearchChange={setEventText}
              loading={events.isFetching}
            />
            <div role="group" aria-label="Booking status" className="ml-auto flex gap-0.5 rounded-lg bg-muted p-[3px]">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tab === t}
                  onClick={() => {
                    setTab(t)
                    pages.reset()
                  }}
                  className={`h-7.5 rounded-md px-3 text-sm font-medium ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border">
            <BookingsTable
              bookings={data?.items}
              onCancel={setToCancel}
              emptyText={tab === 'All' ? 'No bookings yet.' : `No ${tab.toLowerCase()} bookings.`}
              firstPad="px-4"
              showEvent={eventId === ALL}
            />
          </div>

          {data && (
            <CursorPagination depth={pages.depth} count={data.items.length} pageSize={data.pageSize} totalCount={data.totalCount} nextCursor={data.nextCursor} noun="bookings" onPrev={pages.prev} onNext={pages.next} />
          )}
          <p className="text-[13px] text-muted-foreground">Cancelling a paid booking refunds it and puts the tickets back on sale.</p>
        </>
      )}

      <ConfirmDialog
        open={toCancel !== null}
        onOpenChange={(open) => !open && setToCancel(null)}
        pending={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel)}
        title={`Cancel the booking of ${toCancel?.buyer?.fullName ?? 'this buyer'}?`}
        description="A paid booking is refunded and its tickets go back on sale."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
      />
    </div>
  )
}
