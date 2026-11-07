import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { deleteEvent, listCategories, listEvents, type EventListItem, type EventSort } from '@/api/events'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { SearchSelect } from '@/components/SearchSelect'
import { useOrganizerSearch } from '@/features/users/useOrganizerSearch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { formatPriceRange } from '@/lib/formatMoney'
import { stockBadgeClass, stockStatus } from '@/lib/stock'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

const PAGE_SIZE = 10
const SORTS: { value: EventSort; label: string }[] = [
  { value: 'StartsAt', label: 'Soonest first' },
  { value: 'StartsAtDesc', label: 'Latest first' },
  { value: 'Newest', label: 'Newest added' },
]
// Clicks on these keep their own meaning; anywhere else on a row opens the event.
const INTERACTIVE = 'a,button,input,select,[role=menu],[role=menuitem]'

export function EventsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'Admin'
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<EventSort>('StartsAt')
  const [owner, setOwner] = useState('') // Admin's filter: '' everyone, 'me', or an organizer's id
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState<EventListItem | null>(null)
  const search = useDebouncedValue(searchInput.trim(), 300)
  // An Organizer only ever sees their own events; an Admin sees all unless they ask for theirs.
  const organizerId = !isAdmin || owner === 'me' ? user?.id : owner || undefined
  const organizerSearch = useOrganizerSearch(isAdmin)

  const events = useQuery({
    queryKey: ['events', { search, category, sort, organizerId, page }],
    queryFn: () => listEvents({ search, category, sort, organizerId, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery({ queryKey: ['event-categories'], queryFn: listCategories })

  const remove = useMutation({
    mutationFn: (e: EventListItem) => deleteEvent(e.id),
    onSuccess: async (_, e) => {
      setToDelete(null)
      toast.success(`${e.title} was deleted`)
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (e) => {
      setToDelete(null)
      toast.error(describeError(e)) // 409 carries "has bookings" text worth showing as is
    },
  })

  const reset = (apply: () => void) => {
    apply()
    setPage(1)
  }
  const data = events.data
  const columns = isAdmin ? 6 : 5

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        actions={
          <Button asChild size="lg">
            <Link to="/events/new">
              <Plus aria-hidden="true" />
              New event
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-60 flex-1">
          <Search aria-hidden="true" className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search events by title"
            placeholder="Search events…"
            className="h-9 pl-8.5"
            value={searchInput}
            onChange={(e) => reset(() => setSearchInput(e.target.value))}
          />
        </div>
        <SearchSelect
          ariaLabel="Category"
          value={category}
          onChange={(v) => reset(() => setCategory(v))}
          options={[{ value: '', label: 'All categories' }, ...(categories.data ?? []).map((c) => ({ value: c, label: c }))]}
        />
        <SearchSelect
          ariaLabel="Sort by"
          value={sort}
          onChange={(v) => reset(() => setSort(v as EventSort))}
          options={SORTS}
        />
        {isAdmin && (
          <SearchSelect
            ariaLabel="Organizer"
            className="ml-auto"
            value={owner}
            onChange={(v) => reset(() => setOwner(v))}
            options={[
              { value: '', label: 'All organizers' },
              { value: 'me', label: 'My events' },
              ...organizerSearch.options,
            ]}
            searchPlaceholder="Search organizers…"
            onSearchChange={organizerSearch.onSearchChange}
            loading={organizerSearch.loading}
          />
        )}
      </div>

      {events.isError && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load events</AlertTitle>
          <AlertDescription>
            {describeError(events.error)}{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => void events.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="min-w-0 rounded-xl border">
          <Table className="min-w-[72rem] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4">Event</TableHead>
                <TableHead className="h-10 w-36 px-4">Category</TableHead>
                {isAdmin && <TableHead className="h-10 w-40 px-4">Organizer</TableHead>}
                <TableHead className="h-10 w-64 px-4">Tickets</TableHead>
                <TableHead className="h-10 w-52 px-4 text-right">Price</TableHead>
                <TableHead className="h-10 w-14 px-2">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data && (
                <TableRow>
                  <TableCell colSpan={columns} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns} className="h-24 text-center text-muted-foreground">
                    {organizerId && !search && !category
                      ? "You haven't created any events yet."
                      : 'No events match.'}
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={(ev) => {
                    // The row menu is portalled but its clicks still bubble here through React, so test the DOM target.
                    if (!(ev.target as HTMLElement).closest(INTERACTIVE)) void navigate(`/events/${e.id}`)
                  }}
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={e.imageUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-lg bg-brand-soft object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 leading-snug">
                        <Link to={`/events/${e.id}`} className="block truncate font-medium hover:underline">
                          {e.title}
                        </Link>
                        <div className="truncate text-[13px] text-muted-foreground">
                          {formatDateTime(e.startsAt)} · {e.location}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="truncate px-4 py-3 text-foreground/80">{e.category}</TableCell>
                  {isAdmin && (
                    <TableCell className="truncate px-4 py-3">
                      {/* The organizer's page; your own events lead to your profile, which has no admin controls. */}
                      <Link
                        to={e.organizer.id === user?.id ? '/profile' : `/users/${e.organizer.id}`}
                        className="text-foreground/80 hover:text-foreground hover:underline"
                      >
                        {e.organizer.fullName}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3">
                    <TicketStock total={e.totalQuantity} remaining={e.remainingQuantity} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium">
                    {e.minPrice === null ? (
                      <span className="text-muted-foreground">–</span>
                    ) : (
                      <Badge className="bg-gold-soft text-gold">{formatPriceRange(e.minPrice, e.maxPrice)}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${e.title}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/events/${e.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(e)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          noun="events"
          onPageChange={setPage}
        />
      )}

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.title}?</DialogTitle>
            <DialogDescription>
              This removes the event and its tickets. An event that already has bookings cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TicketStock({ total, remaining }: { total: number; remaining: number }) {
  const { label, tone } = stockStatus(total, remaining)
  return (
    <div className="flex items-center gap-2">
      <Badge className={stockBadgeClass[tone]}>{label}</Badge>
      {total > 0 && (
        <span className="text-[13px] text-muted-foreground">
          {remaining} of {total} left
        </span>
      )}
    </div>
  )
}
