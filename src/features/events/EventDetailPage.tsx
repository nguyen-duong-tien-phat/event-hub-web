import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { cancelBooking, listEventBookings, type Booking } from "@/api/bookings";
import {
  deleteEvent,
  getEvent,
  getEventStats,
  type EventStats,
  type TicketStats,
} from "@/api/events";
import { deleteTicket } from "@/api/tickets";
import { BookingsTable } from "@/components/BookingsTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CopyButton } from '@/components/CopyButton'
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { StatCard } from "@/components/StatCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { describeError } from "@/lib/errors";
import { formatMoney } from "@/lib/formatMoney";
import { stockBadgeClass, stockStatus } from "@/lib/stock";
import { AttendeesPanel } from "./AttendeesPanel";
import { TicketDialog } from "./TicketDialog";

const PAGE_SIZE = 10;

export function EventDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [ticketDialog, setTicketDialog] = useState<{
    ticket?: TicketStats;
  } | null>(null);
  const [toDelete, setToDelete] = useState<
    "event" | TicketStats | Booking | null
  >(null);

  const event = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id),
  });
  const stats = useQuery({
    queryKey: ["events", id, "stats"],
    queryFn: () => getEventStats(id),
  });
  const bookings = useQuery({
    queryKey: ["events", id, "bookings", page],
    queryFn: () => listEventBookings(id, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  // One mutation for the three confirmations; every one changes the stats, the bookings and the events list.
  const confirm = useMutation({
    mutationFn: async (target: NonNullable<typeof toDelete>) => {
      if (target === "event") await deleteEvent(id);
      else if ("ticketId" in target) await deleteTicket(target.ticketId);
      else await cancelBooking(target.id);
    },
    onSuccess: async (_, target) => {
      setToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      if (target === "event") {
        toast.success("Event deleted");
        void navigate("/events");
      } else
        toast.success(
          "ticketId" in target
            ? `${target.type} was deleted`
            : "Booking cancelled",
        );
    },
    onError: (e) => {
      setToDelete(null);
      toast.error(describeError(e)); // 409 carries "already sold or held" / "has bookings" text worth showing as is
    },
  });

  const failure = event.error ?? stats.error ?? bookings.error;
  const ev = event.data;
  const s = stats.data;
  const ready = !!ev && !!s;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: "/events", label: "Events" }}
        title={ev?.title ?? "Event"}
        actions={
          ev &&
          !failure && (
            <div className="flex items-center gap-2">
              <CopyButton value={id} label="event id" />
              <CopyButton value={`${window.location.origin}/events/${id}`} label="event link" />
              <Button asChild variant="outline" size="lg">
                <Link to={`/events/${id}/edit`}>Edit event</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-destructive"
                onClick={() => setToDelete("event")}
              >
                Delete
              </Button>
            </div>
          )
        }
      />

      {failure && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this event</AlertTitle>
          <AlertDescription>{describeError(failure)}</AlertDescription>
        </Alert>
      )}
      {!failure && !ready && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!failure && ready && (
        <>
          <section aria-label="Event" className="flex flex-wrap gap-5">
            <img
              src={ev.imageUrl}
              alt=""
              className="h-32 w-52 shrink-0 rounded-xl bg-brand-soft object-cover"
            />
            <div className="min-w-60 flex-1">
              <p className="text-sm text-muted-foreground">
                {formatDateTime(ev.startsAt)} · {ev.location} · {ev.category} ·
                Organized by {ev.organizer.fullName}
              </p>
              {ev.highlights.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {ev.highlights.map((h) => (
                    <li key={h}>
                      <Badge variant="secondary">{h}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <Summary stats={s} />

          <section
            aria-labelledby="tickets-h"
            className="overflow-hidden rounded-xl border"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <div>
                <h2 id="tickets-h" className="text-base font-semibold">
                  Tickets
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Ticket types that have sold cannot be deleted.
                </p>
              </div>
              <Button size="lg" onClick={() => setTicketDialog({})}>
                <Plus aria-hidden="true" />
                Add ticket
              </Button>
            </div>
            <Table className="min-w-176 table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-6">Name</TableHead>
                  <TableHead className="h-10 w-28 px-4">Price</TableHead>
                  <TableHead className="h-10 w-24 px-4">Sold</TableHead>
                  <TableHead className="h-10 w-36 px-4">Remaining</TableHead>
                  <TableHead className="h-10 w-24 px-4">Total</TableHead>
                  <TableHead className="h-10 w-44 pr-6 pl-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.tickets.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No tickets yet.
                    </TableCell>
                  </TableRow>
                )}
                {s.tickets.map((t) => {
                  const { tone } = stockStatus(
                    t.totalQuantity,
                    t.remainingQuantity,
                  );
                  return (
                    <TableRow key={t.ticketId}>
                      <TableCell className="truncate px-6 py-3 font-medium">
                        {t.type}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {formatMoney(t.price)}
                      </TableCell>
                      <TableCell className="px-4 py-3">{t.sold}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge className={stockBadgeClass[tone]}>
                          {t.remainingQuantity} left
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-foreground/80">
                        {t.totalQuantity}
                      </TableCell>
                      <TableCell className="py-3 pr-6 pl-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setTicketDialog({ ticket: t })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-destructive"
                            disabled={t.sold > 0 || t.held > 0}
                            onClick={() => setToDelete(t)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          <AttendeesPanel eventId={id} />

          <section
            aria-labelledby="bookings-h"
            className="overflow-hidden rounded-xl border"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <div>
                <h2 id="bookings-h" className="text-base font-semibold">
                  Bookings
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Cancelling a paid booking refunds it and puts the tickets back
                  on sale.
                </p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link to={`/bookings?event=${id}`}>View all bookings</Link>
              </Button>
            </div>
            <BookingsTable
              bookings={bookings.data?.items}
              onCancel={setToDelete}
            />
            {bookings.data && (
              <div className="border-t px-6 py-3">
                <Pagination
                  page={bookings.data.page}
                  totalPages={bookings.data.totalPages}
                  totalCount={bookings.data.totalCount}
                  pageSize={bookings.data.pageSize}
                  noun="bookings"
                  onPageChange={setPage}
                />
              </div>
            )}
          </section>
        </>
      )}

      {ticketDialog && (
        <TicketDialog
          eventId={id}
          ticket={ticketDialog.ticket}
          onClose={() => setTicketDialog(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        pending={confirm.isPending}
        onConfirm={() => toDelete && confirm.mutate(toDelete)}
        {...(toDelete === "event"
          ? {
              title: `Delete ${ev?.title}?`,
              description:
                "This removes the event and its tickets. An event that already has bookings cannot be deleted.",
              confirmLabel: "Delete event",
            }
          : toDelete && "ticketId" in toDelete
            ? {
                title: `Delete the ${toDelete.type} ticket?`,
                description:
                  "Ticket types that have sold or are held cannot be deleted.",
                confirmLabel: "Delete ticket",
              }
            : {
                title: `Cancel the booking of ${toDelete?.buyer?.fullName ?? "this buyer"}?`,
                description:
                  "A paid booking is refunded and its tickets go back on sale.",
                confirmLabel: "Cancel booking",
                cancelLabel: "Keep booking",
              })}
      />
    </div>
  );
}

function Summary({ stats }: { stats: EventStats }) {
  const { bookings, tickets } = stats;
  const total = tickets.reduce((n, t) => n + t.totalQuantity, 0);
  const held = tickets.reduce((n, t) => n + t.held, 0);
  return (
    <section
      aria-label="Sales summary"
      className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4"
    >
      <StatCard
        label="Bookings"
        value={bookings.pending + bookings.confirmed + bookings.cancelled}
        note={`${bookings.confirmed} confirmed · ${bookings.pending} pending · ${bookings.cancelled} cancelled`}
      />
      <StatCard
        label="Ticket revenue"
        value={formatMoney(stats.ticketRevenue)}
        note={`Without ${formatMoney(stats.serviceFees)} in service fees`}
      />
      <StatCard
        label="Tickets sold"
        value={
          <>
            {stats.ticketsSold}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              of {total}
            </span>
          </>
        }
        note={`${held} held by pending bookings`}
      />
      <StatCard
        label="Checked in"
        value={
          <>
            {stats.checkedIn}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              of {stats.ticketsSold}
            </span>
          </>
        }
        note="Counts confirmed bookings only"
      />
    </section>
  );
}
