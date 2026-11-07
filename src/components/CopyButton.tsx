import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// Copies `value` (what you would send to someone: an id, an email, a link). `label` names it for the label and the toast.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy(e: React.MouseEvent) {
    e.stopPropagation() // a clickable table row must not open
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      toast.error('Could not copy')
      return
    }
    toast.success(`${label} copied`)
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Copy ${label}`} onClick={copy}>
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
    </Button>
  )
}
