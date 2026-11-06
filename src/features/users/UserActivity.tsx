import { useQueries, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getEventStats, listEventsByOrganizer, type EventListItem, type EventStats } from '@/api/events'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeError } from '@/lib/errors'
import { formatMoney } from '@/lib/formatMoney'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const totalTickets = (s: EventStats) => s.tickets.reduce((n, t) => n + t.totalQuantity, 0)

const isPast = (e: EventListItem, now: number) => new Date(e.startsAt).getTime() < now

function status(e: EventListItem, now: number, s?: EventStats) {
  if (isPast(e, now)) return <Badge variant="secondary">Past</Badge>
  if (!s) return null
  if (s.tickets.length === 0) return <Badge variant="secondary">No tickets</Badge>
  if (s.tickets.every((t) => t.remainingQuantity === 0)) return <Badge variant="secondary">Sold out</Badge>
  return <Badge className="bg-success-soft text-success">On sale</Badge>
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border p-5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>
    </div>
  )
}

// What an organizer has put on and sold. The API has no per-organizer totals, so this sums the stats of each event.
export function UserActivity({ userId, name, role }: { userId: string; name: string; role: string }) {
  const events = useQuery({ queryKey: ['events', 'by-organizer', userId], queryFn: () => listEventsByOrganizer(userId), enabled: role === 'Organizer' })
  const [now] = useState(() => Date.now()) // fixed at mount so a re-render cannot move an event between upcoming and past
  const items = events.data?.items ?? []
  const stats = useQueries({
    queries: items.map((e) => ({ queryKey: ['events', e.id, 'stats'], queryFn: () => getEventStats(e.id) })),
  })

  if (role !== 'Organizer') {
    return (
      <section className="flex min-h-30 items-center justify-center rounded-xl border border-dashed bg-sidebar p-6 text-center text-muted-foreground">
        No activity to show for {role} accounts.
      </section>
    )
  }
  if (events.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the events</AlertTitle>
        <AlertDescription>{describeError(events.error)}</AlertDescription>
      </Alert>
    )
  }

  const loaded = stats.flatMap((s) => (s.data ? [s.data] : []))
  const ready = events.isSuccess && loaded.length === items.length
  const num = (n: number) => (ready ? String(n) : '…')
  const upcoming = items.filter((e) => !isPast(e, now)).length
  const soldInPast = items.reduce((n, e, i) => (isPast(e, now) ? n + (stats[i].data?.ticketsSold ?? 0) : n), 0)
  const failed = stats.some((s) => s.isError)

  return (
    <>
      <section aria-label="Organizer summary" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <Stat label="Events" value={events.isSuccess ? String(events.data.totalCount) : '…'} note={events.isSuccess ? `${upcoming} upcoming · ${items.length - upcoming} past` : ''} />
        <Stat label="Tickets sold" value={num(loaded.reduce((n, s) => n + s.ticketsSold, 0))} note="Confirmed bookings only" />
        <Stat label="Ticket revenue" value={ready ? formatMoney(loaded.reduce((n, s) => n + s.ticketRevenue, 0)) : '…'} note="Without service fees" />
        <Stat label="Check-ins" value={ready ? `${loaded.reduce((n, s) => n + s.checkedIn, 0)} of ${soldInPast}` : '…'} note="Tickets of past events" />
      </section>
      {failed && <p className="text-[13px] text-destructive">Some numbers could not be loaded and are left out of the totals.</p>}

      <section aria-labelledby="events-h" className="overflow-hidden rounded-xl border">
        <h2 id="events-h" className="px-6 py-5 text-base font-semibold">
          Events by {name}
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-6">Event</TableHead>
              <TableHead className="h-10 px-4">Date</TableHead>
              <TableHead className="h-10 px-4">Tickets sold</TableHead>
              <TableHead className="h-10 px-4 text-right">Revenue</TableHead>
              <TableHead className="h-10 pr-6 pl-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.isPending && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {events.isSuccess && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No events yet.
                </TableCell>
              </TableRow>
            )}
            {items.map((e, i) => {
              const s = stats[i].data
              return (
                <TableRow key={e.id}>
                  <TableCell className="px-6 py-3 font-medium">{e.title}</TableCell>
                  <TableCell className="px-4 py-3 text-foreground/80">{when(e.startsAt)}</TableCell>
                  <TableCell className="px-4 py-3 text-foreground/80">{s ? `${s.ticketsSold} of ${totalTickets(s)}` : stats[i].isError ? '–' : '…'}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium">{s ? formatMoney(s.ticketRevenue) : stats[i].isError ? '–' : '…'}</TableCell>
                  <TableCell className="py-3 pr-6 pl-4">{status(e, now, s)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {events.isSuccess && events.data.totalCount > items.length && (
          <p className="border-t px-6 py-3 text-[13px] text-muted-foreground">Showing the first {items.length} events</p>
        )}
      </section>
    </>
  )
}
