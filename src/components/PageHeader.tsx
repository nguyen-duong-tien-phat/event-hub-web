import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PageHeaderSlot } from './pageHeaderSlot'

// Puts the page's title (its one h1) and main action into the layout's header bar.
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const slot = useContext(PageHeaderSlot)
  const content = (
    <>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {actions}
    </>
  )

  if (slot === undefined) return <div className="flex flex-wrap items-center justify-between gap-3">{content}</div>
  return slot && createPortal(content, slot)
}
