import { Button } from '@/components/ui/button'

interface Props {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  noun: string // "users", "events"
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalCount, pageSize, noun, onPageChange }: Props) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">
        {totalCount === 0 ? `No ${noun}` : `Showing ${from} to ${to} of ${totalCount} ${noun}`}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
