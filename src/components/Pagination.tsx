import { Button } from '@/components/ui/button'

function Pager({ summary, canPrev, canNext, onPrev, onNext }: { summary: string; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{summary}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8" disabled={!canPrev} onClick={onPrev}>
          Previous
        </Button>
        <Button variant="outline" size="sm" className="h-8" disabled={!canNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}

const summaryOf = (from: number, to: number, totalCount: number, noun: string) =>
  totalCount === 0 ? `No ${noun}` : `Showing ${from} to ${to} of ${totalCount} ${noun}`

interface Props {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  noun: string // "users", "events"
  onPageChange: (page: number) => void
}

// Offset mode: numbered pages (users, a user's history, the sales table).
export function Pagination({ page, totalPages, totalCount, pageSize, noun, onPageChange }: Props) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  return (
    <Pager
      summary={summaryOf(from, Math.min(page * pageSize, totalCount), totalCount, noun)}
      canPrev={page > 1}
      canNext={page < totalPages}
      onPrev={() => onPageChange(page - 1)}
      onNext={() => onPageChange(page + 1)}
    />
  )
}

interface CursorProps {
  depth: number // pages already passed: 0 on the first page
  count: number // items on this page
  pageSize: number
  totalCount: number
  nextCursor?: string | null
  noun: string
  onPrev: () => void
  onNext: (cursor: string) => void
}

// Cursor (keyset) mode: Previous and Next only, the position comes from how deep the cursor stack is.
export function CursorPagination({ depth, count, pageSize, totalCount, nextCursor, noun, onPrev, onNext }: CursorProps) {
  const from = count === 0 ? 0 : depth * pageSize + 1
  return (
    <Pager
      summary={summaryOf(from, depth * pageSize + count, totalCount, noun)}
      canPrev={depth > 0}
      canNext={!!nextCursor}
      onPrev={onPrev}
      onNext={() => nextCursor && onNext(nextCursor)}
    />
  )
}
