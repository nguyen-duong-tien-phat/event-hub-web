import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listManagedBookings, type BookingStatus } from '@/api/bookings'
import { bookingTone } from '@/components/BookingsTable'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { checkInSummary } from '@/lib/checkIn'
import { formatDateTime } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { formatMoney } from '@/lib/formatMoney'
import { stockBadgeClass } from '@/lib/stock'

const PAGE_SIZE = 10
const TABS: ('All' | BookingStatus)[] = ['All', 'Confirmed', 'Pending', 'Cancelled']
const INTERACTIVE = 'a,button,input,select,[role=combobox],[role=listbox],[role=option]'

// An attendee's bookings, newest first: what they bought, whether they got in, what they paid. Read only.
export function AttendeeHistory({ userId, name }: { userId: string; name: string }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const [page, setPage] = useState(1)
  const status = tab === 'All' ? undefined : tab
  const history = useQuery({
    queryKey: ['users', 'history', userId, status, page],
    queryFn: () => listManagedBookings({ userId, status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const data = history.data
  const message = (text: string) => (
    <TableRow>
      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )

  return (
    <section aria-labelledby="history-h" className="flex flex-col gap-4 rounded-xl border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="history-h" className="text-base font-semibold">
            History
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Bookings made by {name}</p>
        </div>
        <div role="group" aria-label="Booking status" className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t)
                setPage(1)
              }}
              className={`h-7.5 rounded-md px-3 text-sm font-medium ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {history.isError && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the history</AlertTitle>
          <AlertDescription>{describeError(history.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border">
          <Table className="min-w-4xl table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4">Event</TableHead>
                <TableHead className="h-10 w-48 px-4">Tickets</TableHead>
                <TableHead className="h-10 w-40 px-4">Status</TableHead>
                <TableHead className="h-10 w-28 px-4 text-right">Total</TableHead>
                <TableHead className="h-10 w-44 px-4">Booked at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data && message('Loading…')}
              {data?.items.length === 0 && message(tab === 'All' ? 'No bookings yet.' : `No ${tab.toLowerCase()} bookings.`)}
              {data?.items.map((b) => (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest(INTERACTIVE)) void navigate(`/bookings/${b.id}`)
                  }}
                >
                  <TableCell className="px-4 py-3">
                    <div className="min-w-0 leading-snug">
                      <Link to={`/events/${b.eventId}`} className="block truncate font-medium hover:underline">
                        {b.event?.title ?? b.eventId}
                      </Link>
                      {b.event?.startsAt && (
                        <div className="truncate text-[13px] text-muted-foreground">
                          {formatDateTime(b.event.startsAt)}
                          {b.event.location && ` · ${b.event.location}`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="truncate px-4 py-3 text-foreground/80">
                    {b.tickets.map((t) => `${t.quantity} × ${t.type}`).join(', ')}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={stockBadgeClass[bookingTone[b.status]]}>{b.status}</Badge>
                    {checkInSummary(b.checkedInCount, b.quantity) && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">{checkInSummary(b.checkedInCount, b.quantity)}</div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium">{formatMoney(b.totalPrice)}</TableCell>
                  <TableCell className="truncate px-4 py-3 text-foreground/80">{formatDateTime(b.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} noun="bookings" onPageChange={setPage} />
      )}
    </section>
  )
}
