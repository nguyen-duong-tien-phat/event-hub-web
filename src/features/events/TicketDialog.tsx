import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { TicketStats } from '@/api/events'
import { createTicket, updateTicket, type TicketPatch } from '@/api/tickets'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeError } from '@/lib/errors'

const number = (message: string) => z.number({ error: message })
const schema = z.object({
  type: z.string().trim().min(1, 'Enter a name'),
  price: number('Enter a price').gt(0, 'Price must be greater than zero'),
  totalQuantity: number('Enter a quantity').int('Whole tickets only').min(1, 'At least 1'),
  maxPerOrder: number('Enter a number').int('Whole tickets only').min(1, 'At least 1'),
})
type Values = z.infer<typeof schema>

// Add (no ticket) or edit one ticket type of an event. Mount it fresh for each use so the form starts from the ticket.
export function TicketDialog({ eventId, ticket, onClose }: { eventId: string; ticket?: TicketStats; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: ticket
      ? { type: ticket.type, price: ticket.price, totalQuantity: ticket.totalQuantity, maxPerOrder: 4 }
      : { type: '', maxPerOrder: 4 },
  })

  async function onSubmit(v: Values) {
    setError(undefined)
    try {
      if (ticket) {
        // Only what changed; a total below what is sold or held comes back as a 400 message.
        const patch: TicketPatch = {}
        if (v.type !== ticket.type) patch.type = v.type
        if (v.price !== ticket.price) patch.price = v.price
        if (v.totalQuantity !== ticket.totalQuantity) patch.totalQuantity = v.totalQuantity
        if (Object.keys(patch).length > 0) await updateTicket(ticket.ticketId, patch)
      } else {
        await createTicket({ eventId, type: v.type, price: v.price, totalQuantity: v.totalQuantity, maxPerOrder: v.maxPerOrder })
      }
      // Ticket changes move the event's stats and the list's price and tickets columns.
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(ticket ? 'Ticket saved' : 'Ticket added')
      onClose()
    } catch (e) {
      setError(describeError(e))
    }
  }

  const field = 'flex flex-col gap-2'
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-4 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{ticket ? 'Edit ticket' : 'Add ticket'}</DialogTitle>
          <DialogDescription>
            {ticket ? 'Change the name, the price or the total number of tickets.' : 'A new ticket type for this event.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className={field}>
            <Label htmlFor="ticket-type">Name</Label>
            <Input id="ticket-type" className="h-9" placeholder="General admission" aria-invalid={!!errors.type} {...register('type')} />
            {errors.type && <p className="text-[13px] text-destructive">{errors.type.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={field}>
              <Label htmlFor="ticket-price">Price (USD)</Label>
              <Input
                id="ticket-price"
                type="number"
                step="0.01"
                className="h-9"
                aria-invalid={!!errors.price}
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && <p className="text-[13px] text-destructive">{errors.price.message}</p>}
            </div>
            <div className={field}>
              <Label htmlFor="ticket-total">Total tickets</Label>
              <Input
                id="ticket-total"
                type="number"
                className="h-9"
                aria-invalid={!!errors.totalQuantity}
                {...register('totalQuantity', { valueAsNumber: true })}
              />
              {errors.totalQuantity && <p className="text-[13px] text-destructive">{errors.totalQuantity.message}</p>}
            </div>
          </div>
          {!ticket && (
            <div className={field}>
              <Label htmlFor="ticket-max">Max per order</Label>
              <Input
                id="ticket-max"
                type="number"
                className="h-9"
                aria-invalid={!!errors.maxPerOrder}
                {...register('maxPerOrder', { valueAsNumber: true })}
              />
              {errors.maxPerOrder ? (
                <p className="text-[13px] text-destructive">{errors.maxPerOrder.message}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground">It cannot be changed after the ticket is created.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : ticket ? 'Save ticket' : 'Add ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
