import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { listEventAdmissions } from '@/api/events'
import { CopyButton } from '@/components/CopyButton'
import { Pagination } from '@/components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { groupCode } from '@/lib/checkIn'
import { formatDateTime } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { stockBadgeClass } from '@/lib/stock'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

const PAGE_SIZE = 10
const TABS = [
  { label: 'All', checkedIn: undefined },
  { label: 'Checked in', checkedIn: true },
  { label: 'Not yet', checkedIn: false },
] as const

// Who holds a ticket to the event and whether they got in; the API searches code, name and email.
export function AttendeesPanel({ eventId }: { eventId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0])
  const [text, setText] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(text.trim(), 300)

  // Under the 'events' key, so anything that invalidates the event's data (a cancelled booking) reloads this too.
  const admissions = useQuery({
    queryKey: ['events', eventId, 'admissions', tab.checkedIn, search, page],
    queryFn: () => listEventAdmissions(eventId, { checkedIn: tab.checkedIn, search, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const data = admissions.data
  const message = (content: string, tone = 'text-muted-foreground') => (
    <TableRow>
      <TableCell colSpan={3} className={`h-24 text-center ${tone}`}>
        {content}
      </TableCell>
    </TableRow>
  )

  return (
    <section aria-labelledby="attendees-h" className="overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <h2 id="attendees-h" className="text-base font-semibold">
            Attendees
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">One row per person who can get in.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search aria-hidden="true" className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search attendees"
              placeholder="Search code, name or email"
              className="h-9 pl-8.5"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div role="group" aria-label="Check-in status" className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
            {TABS.map((t) => (
              <button
                key={t.label}
                type="button"
                aria-pressed={tab.label === t.label}
                onClick={() => {
                  setTab(t)
                  setPage(1)
                }}
                className={`h-7.5 rounded-md px-3 text-sm font-medium ${tab.label === t.label ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Table className="min-w-176 table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 w-64 px-6">Ticket</TableHead>
            <TableHead className="h-10 px-4">Holder</TableHead>
            <TableHead className="h-10 w-72 pr-6 pl-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admissions.isError && !data && message(describeError(admissions.error), 'text-destructive')}
          {admissions.isPending && message('Loading…')}
          {data?.items.length === 0 && message(search || tab.checkedIn !== undefined ? 'No attendees match.' : 'No attendees yet.')}
          {data?.items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="px-6 py-3">
                <div className="min-w-0 leading-snug">
                  <div className="truncate font-medium">{a.ticketType}</div>
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <code className="font-mono">{groupCode(a.shortCode)}</code>
                    <CopyButton value={a.shortCode} label="ticket code" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="min-w-0 leading-snug">
                  <Link to={`/bookings/${a.bookingId}`} state={{ buyer: a.buyer }} className="block truncate font-medium hover:underline">
                    {a.buyer.fullName}
                  </Link>
                  <div className="truncate text-[13px] text-muted-foreground">{a.buyer.email}</div>
                </div>
              </TableCell>
              <TableCell className="py-3 pr-6 pl-4">
                {a.checkedInAt ? (
                  <Badge className={`${stockBadgeClass.ok} max-w-full truncate`}>
                    Checked in {formatDateTime(a.checkedInAt)}
                    {a.checkedInBy && ` by ${a.checkedInBy.fullName}`}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not yet</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data && (
        <div className="border-t px-6 py-3">
          <Pagination page={data.page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} noun="attendees" onPageChange={setPage} />
        </div>
      )}
    </section>
  )
}
