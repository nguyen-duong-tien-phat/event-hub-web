import { Check, ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface SearchOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SearchOption[]
  ariaLabel: string
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  /**
   * Given: the list is searched elsewhere (the API). The typed text is passed up, the options are shown as they are
   * and the caller debounces. Left out: options are filtered here by label.
   */
  onSearchChange?: (text: string) => void
  loading?: boolean
}

// A dropdown with a search box on top. The selected label stays visible even when a server-side search no longer lists it.
export function SearchSelect({
  value,
  onChange,
  options,
  ariaLabel,
  id,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  className,
  onSearchChange,
  loading,
}: Props) {
  const [open, setOpen] = useState(false)
  const labels = useRef(new Map<string, string>())
  for (const o of options) labels.current.set(o.value, o.label)
  const selected = labels.current.get(value)

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) onSearchChange?.('') // the next opening starts from the full list
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-9 w-fit items-center justify-between gap-2 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm whitespace-nowrap outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', selected === undefined && 'text-muted-foreground')}>{selected ?? placeholder}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-48 p-0">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            <CommandEmpty>{loading ? 'Searching…' : 'No results.'}</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={o.label}
                onSelect={() => {
                  onChange(o.value)
                  changeOpen(false)
                }}
              >
                {o.label}
                <Check aria-hidden="true" className={cn('ml-auto size-4', o.value === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
