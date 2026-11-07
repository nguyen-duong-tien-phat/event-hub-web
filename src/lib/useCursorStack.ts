import { useState } from 'react'

// Keyset paging: the first page has no cursor, Next pushes that page's nextCursor, Previous pops it.
export function useCursorStack() {
  const [stack, setStack] = useState<string[]>([])
  return {
    cursor: stack.at(-1),
    depth: stack.length, // 0 on the first page
    next: (cursor: string) => setStack((s) => [...s, cursor]),
    prev: () => setStack((s) => s.slice(0, -1)),
    reset: () => setStack((s) => (s.length ? [] : s)), // same array when already on page 1: no re-render
  }
}
