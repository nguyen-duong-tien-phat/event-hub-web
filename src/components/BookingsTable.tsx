import { Link, useNavigate } from "react-router";
import type { Booking } from "@/api/bookings";
import { CopyButton } from "@/components/CopyButton"
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
import { checkInSummary } from "@/lib/checkIn";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/formatMoney";
import { stockBadgeClass, type StockTone } from "@/lib/stock";

export const bookingTone: Record<Booking["status"], StockTone> = {
  Confirmed: "ok",
  Pending: "low",
  Cancelled: "none",
};

// Clicks on these keep their own meaning; anywhere else on a row opens the booking.
const INTERACTIVE =
  "a,button,input,select,[role=combobox],[role=listbox],[role=option]";

// One bookings table for the event page and the Bookings page; `bookings` undefined means still loading.
export function BookingsTable({
  bookings,
  onCancel,
  emptyText = "No bookings yet.",
  firstPad = "px-6",
  showEvent = false,
}: {
  bookings: Booking[] | undefined;
  onCancel: (b: Booking) => void;
  emptyText?: string;
  firstPad?: string;
  showEvent?: boolean; // an Event column, for lists that mix events
}) {
  const navigate = useNavigate();
  const message = (text: string) => (
    <TableRow>
      <TableCell colSpan={showEvent ? 7 : 6} className="h-24 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
  return (
    <Table className={showEvent ? "min-w-6xl table-fixed" : "min-w-4xl table-fixed"}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`h-10 ${firstPad}`}>Buyer</TableHead>
          {showEvent && <TableHead className="h-10 w-56 px-4">Event</TableHead>}
          <TableHead className="h-10 w-56 px-4">Tickets</TableHead>
          <TableHead className="h-10 w-28 px-4 text-right">Total</TableHead>
          <TableHead className="h-10 w-40 px-4">Status</TableHead>
          <TableHead className="h-10 w-40 px-4">Booked at</TableHead>
          <TableHead className="h-10 w-40 pr-6 pl-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!bookings && message("Loading…")}
        {bookings?.length === 0 && message(emptyText)}
        {bookings?.map((b) => (
          <TableRow
            key={b.id}
            className="cursor-pointer"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest(INTERACTIVE))
                void navigate(`/bookings/${b.id}`, {
                  state: { buyer: b.buyer },
                });
            }}
          >
            <TableCell className={`${firstPad} py-3`}>
              <div className="min-w-0 leading-snug">
                <Link
                  to={`/bookings/${b.id}`}
                  state={{ buyer: b.buyer }}
                  className="block truncate font-medium hover:underline"
                >
                  {b.buyer?.fullName ?? "–"}
                </Link>
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <span className="truncate">{b.buyer?.email}</span>
                  {b.buyer && <CopyButton value={b.buyer.email} label="buyer email" />}
                </div>
              </div>
            </TableCell>
            {showEvent && (
              <TableCell className="truncate px-4 py-3">
                <Link to={`/events/${b.eventId}`} className="text-foreground/80 hover:text-foreground hover:underline">
                  {b.event?.title ?? b.eventId}
                </Link>
              </TableCell>
            )}
            <TableCell className="truncate px-4 py-3 text-foreground/80">
              {b.tickets.map((t) => `${t.quantity} × ${t.type}`).join(", ")}
            </TableCell>
            <TableCell className="px-4 py-3 text-right font-medium">
              {formatMoney(b.totalPrice)}
            </TableCell>
            <TableCell className="px-4 py-3">
              <Badge className={stockBadgeClass[bookingTone[b.status]]}>
                {b.status}
              </Badge>
              {checkInSummary(b.checkedInCount, b.quantity) && (
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {checkInSummary(b.checkedInCount, b.quantity)}
                </div>
              )}
            </TableCell>
            <TableCell className="truncate px-4 py-3 text-foreground/80">
              {formatDateTime(b.createdAt)}
            </TableCell>
            <TableCell className="py-3 pr-6 pl-4 text-right">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-destructive"
                disabled={b.status === "Cancelled" || !b.canCancel}
                title={b.checkedInCount > 0 ? "Already checked in" : undefined}
                onClick={() => onCancel(b)}
              >
                Cancel booking
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
