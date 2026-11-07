import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getEventsSales, type EventSales } from '@/api/events'
import { Pagination } from '@/components/Pagination'
import { StatCard } from '@/components/StatCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeError } from '@/lib/errors'
import { formatMoney } from '@/lib/formatMoney'
import { AttendeeHistory } from './AttendeeHistory'

const PAGE_SIZE = 10

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function status(e: EventSales, now: number) {
  if (new Date(e.startsAt).getTime() < now) return <Badge variant="secondary">Past</Badge>
  if (e.totalQuantity === 0) return <Badge variant="secondary">No tickets</Badge>
  if (e.remainingQuantity === 0) return <Badge variant="secondary">Sold out</Badge>
  return <Badge className="bg-success-soft text-success">On sale</Badge>
}

// What an organizer has put on and sold: totals and per-event numbers come from one request (GET /events/sales).
// showEvents false keeps just the numbers (the Organizer's own profile).
export function UserActivity({ userId, name, role, showEvents = true }: { userId: string; name: string; role: string; showEvents?: boolean }) {
  const [page, setPage] = useState(1)
  const [now] = useState(() => Date.now()) // fixed at mount so a re-render cannot move an event between upcoming and past
  const sales = useQuery({
    queryKey: ['events', 'sales', userId, page],
    queryFn: () => getEventsSales({ organizerId: userId, page, pageSize: PAGE_SIZE }),
    enabled: role === 'Organizer',
    placeholderData: keepPreviousData,
  })

  if (role === 'Attendee') return <AttendeeHistory userId={userId} name={name} />
  if (role !== 'Organizer') {
    return (
      <section className="flex min-h-30 items-center justify-center rounded-xl border border-dashed bg-sidebar p-6 text-center text-muted-foreground">
        No activity to show for {role} accounts.
      </section>
    )
  }
  if (sales.isError && !sales.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the sales numbers</AlertTitle>
        <AlertDescription>{describeError(sales.error)}</AlertDescription>
      </Alert>
    )
  }

  const summary = sales.data?.summary
  const events = sales.data?.events
  const num = (n?: number) => (n === undefined ? '…' : String(n))

  return (
    <>
      <section aria-label="Organizer summary" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <StatCard label="Events" value={num(summary?.events)} note={summary ? `${summary.upcoming} upcoming · ${summary.past} past` : ''} />
        <StatCard label="Tickets sold" value={num(summary?.ticketsSold)} note="Confirmed bookings only" />
        <StatCard label="Ticket revenue" value={summary ? formatMoney(summary.ticketRevenue) : '…'} note="Without service fees" />
        <StatCard label="Check-ins" value={summary ? `${summary.checkedIn} of ${summary.ticketsSoldOfPastEvents}` : '…'} note="Tickets of past events" />
      </section>

      {showEvents && (
        <section aria-labelledby="events-h" className="overflow-hidden rounded-xl border">
          <h2 id="events-h" className="px-6 py-5 text-base font-semibold">
            Events by {name}
          </h2>
          <Table className="min-w-[48rem] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-6">Event</TableHead>
                <TableHead className="h-10 w-52 px-4">Date</TableHead>
                <TableHead className="h-10 w-36 px-4">Tickets sold</TableHead>
                <TableHead className="h-10 w-36 px-4 text-right">Revenue</TableHead>
                <TableHead className="h-10 w-32 pr-6 pl-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!events && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {events?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No events yet.
                  </TableCell>
                </TableRow>
              )}
              {events?.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="truncate px-6 py-3 font-medium">{e.title}</TableCell>
                  <TableCell className="px-4 py-3 text-foreground/80">{when(e.startsAt)}</TableCell>
                  <TableCell className="px-4 py-3 text-foreground/80">{`${e.ticketsSold} of ${e.totalQuantity}`}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium">{formatMoney(e.ticketRevenue)}</TableCell>
                  <TableCell className="py-3 pr-6 pl-4">{status(e, now)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {events && events.totalCount > 0 && (
            <div className="border-t px-6 py-3">
              <Pagination page={events.page} totalPages={events.totalPages} totalCount={events.totalCount} pageSize={events.pageSize} noun="events" onPageChange={setPage} />
            </div>
          )}
        </section>
      )}
    </>
  )
}
