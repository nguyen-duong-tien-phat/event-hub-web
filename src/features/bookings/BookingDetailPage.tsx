import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import { cancelBooking, getBooking, type Booking } from '@/api/bookings'
import { bookingTone } from '@/components/BookingsTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CopyButton } from '@/components/CopyButton'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { checkInSummary, groupCode } from '@/lib/checkIn'
import { formatDateTime } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { formatMoney } from '@/lib/formatMoney'
import { stockBadgeClass } from '@/lib/stock'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[13px] text-muted-foreground">{label}</div>
    <div className="mt-1 leading-snug">{children}</div>
  </div>
)

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const query = useQuery({ queryKey: ['bookings', id], queryFn: () => getBooking(id) })
  const b = query.data
  // GET /bookings/{id} does not load the buyer; the list the user came from passes it along. A direct link has none.
  const buyer = b?.buyer ?? (location.state as { buyer?: Booking['buyer'] } | null)?.buyer

  const cancel = useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: async () => {
      toast.success('Booking cancelled')
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['bookings'] }), queryClient.invalidateQueries({ queryKey: ['events'] })])
    },
    onError: (e) => toast.error(describeError(e)),
    onSettled: () => setConfirming(false),
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/bookings', label: 'Bookings' }}
        title={`Booking ${id.slice(-6).toUpperCase()}`}
        actions={
          b && (
            <div className="flex items-center gap-2">
              <span title={id} className="contents">
                <CopyButton value={id} label="booking id" />
              </span>
              <CopyButton value={`${window.location.origin}/bookings/${id}`} label="booking link" />
              <Button variant="outline" size="lg" className="text-destructive" disabled={!b.canCancel} onClick={() => setConfirming(true)}>
                Cancel booking
              </Button>
            </div>
          )
        }
      />

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this booking</AlertTitle>
          <AlertDescription>{describeError(query.error)}</AlertDescription>
        </Alert>
      )}
      {query.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {b && b.checkedInCount > 0 && b.status !== 'Cancelled' && (
        <p className="text-[13px] text-muted-foreground">Already checked in, so this booking can no longer be cancelled.</p>
      )}

      {b && (
        <>
          <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 rounded-xl border p-6">
            <Field label="Status">
              <Badge className={stockBadgeClass[bookingTone[b.status]]}>{b.status}</Badge>
              {checkInSummary(b.checkedInCount, b.admissions.length) && (
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  {b.checkedInCount >= b.admissions.length && <Badge className={stockBadgeClass.ok}>Checked in</Badge>}
                  {b.checkedInCount < b.admissions.length && checkInSummary(b.checkedInCount, b.admissions.length)}
                </div>
              )}
            </Field>
            <Field label="Buyer">
              {buyer ? (
                <>
                  <Link to={`/users/${buyer.id}`} className="font-medium hover:underline">
                    {buyer.fullName}
                  </Link>
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    {buyer.email}
                    <CopyButton value={buyer.email} label="buyer email" />
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">–</span>
              )}
            </Field>
            <Field label="Event">
              {b.event ? (
                <>
                  <Link to={`/events/${b.event.id}`} className="font-medium hover:underline">
                    {b.event.title}
                  </Link>
                  <div className="text-[13px] text-muted-foreground">
                    {formatDateTime(b.event.startsAt)} · {b.event.location}
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">–</span>
              )}
            </Field>
            <Field label="Booked at">
              <span className="font-medium">{formatDateTime(b.createdAt)}</span>
              {b.status === 'Pending' && <div className="text-xs text-muted-foreground">Held until {formatDateTime(b.expiresAt)}</div>}
            </Field>
          </section>

          <section aria-labelledby="items-h" className="overflow-hidden rounded-xl border">
            <h2 id="items-h" className="px-6 py-5 text-base font-semibold">
              Tickets
            </h2>
            <Table className="min-w-[35rem] table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-6">Ticket type</TableHead>
                  <TableHead className="h-10 w-36 px-4 text-right">Unit price</TableHead>
                  <TableHead className="h-10 w-28 px-4 text-right">Quantity</TableHead>
                  <TableHead className="h-10 w-36 pr-6 pl-4 text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.tickets.map((t) => (
                  <TableRow key={t.ticketId}>
                    <TableCell className="truncate px-6 py-3 font-medium">{t.type}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{formatMoney(t.unitPrice)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{t.quantity}</TableCell>
                    <TableCell className="py-3 pr-6 pl-4 text-right font-medium">{formatMoney(t.unitPrice * t.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-8 gap-y-2 px-6 py-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-right">{formatMoney(b.subtotal)}</dd>
              <dt className="text-muted-foreground">Service fee (1%)</dt>
              <dd className="text-right">{formatMoney(b.serviceFee)}</dd>
              <dt className="border-t pt-2 font-semibold">Total</dt>
              <dd className="border-t pt-2 text-right font-semibold">{formatMoney(b.totalPrice)}</dd>
            </dl>
          </section>

          {b.status === 'Confirmed' && b.admissions.length > 0 && (
            <section aria-labelledby="codes-h" className="overflow-hidden rounded-xl border">
              <div className="px-6 py-5">
                <h2 id="codes-h" className="text-base font-semibold">
                  Ticket codes
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">One QR code per person. Check-in scans these codes or types the short code.</p>
              </div>
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 border-t p-6">
                {b.admissions.map((a, i) => (
                  <li key={a.id} className="flex flex-col items-center gap-2 rounded-xl border p-4">
                    <div className="relative">
                      {/* White behind the code in every theme: scanners need dark modules on a light ground. */}
                      <div className={`rounded-md bg-white p-2 ${a.checkedInAt ? 'opacity-35' : ''}`}>
                        <QRCodeSVG value={a.code} size={128} level="M" role="img" aria-label={`QR code for ticket ${i + 1}`} />
                      </div>
                      {a.checkedInAt && (
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background px-3.5 py-1.5 text-xs font-semibold tracking-wider shadow-sm">
                          USED
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-medium">
                      Ticket {i + 1} of {b.admissions.length} · {a.ticketType}
                    </div>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-sm tracking-wide text-foreground/80">{groupCode(a.shortCode)}</code>
                      <CopyButton value={a.shortCode} label={`ticket ${i + 1} code`} />
                    </div>
                    {a.checkedInAt ? (
                      <Badge className={`${stockBadgeClass.ok} max-w-full truncate`}>
                        Checked in {formatDateTime(a.checkedInAt)}
                        {a.checkedInBy && ` by ${a.checkedInBy.fullName}`}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not used</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        title={`Cancel the booking of ${buyer?.fullName ?? 'this buyer'}?`}
        description="A paid booking is refunded and its tickets go back on sale."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
      />
    </div>
  )
}
