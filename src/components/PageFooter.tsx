import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PageFooterSlot } from './pageHeaderSlot'

// Puts a page's main actions into the bar docked under the scrolling content (in place when there is no layout).
export function PageFooter({ children }: { children: ReactNode }) {
  const slot = useContext(PageFooterSlot)
  if (slot === undefined) return <div className="flex justify-end gap-2 border-t pt-4">{children}</div>
  return slot && createPortal(children, slot)
}
