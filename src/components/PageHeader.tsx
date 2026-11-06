import { ArrowLeft } from 'lucide-react'
import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { PageHeaderSlot } from './pageHeaderSlot'

interface Props {
  title: string
  actions?: ReactNode
  back?: { to: string; label: string }
}

// Puts the page's title (its one h1) and main action into the layout's header bar.
export function PageHeader({ title, actions, back }: Props) {
  const slot = useContext(PageHeaderSlot)
  const content = (
    <>
      <div className="flex items-center gap-3">
        {back && (
          <Link to={back.to} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      {actions}
    </>
  )

  if (slot === undefined) return <div className="flex flex-wrap items-center justify-between gap-3">{content}</div>
  return slot && createPortal(content, slot)
}
