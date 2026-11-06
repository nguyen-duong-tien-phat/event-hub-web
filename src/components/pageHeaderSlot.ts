import { createContext } from 'react'

// The layout's header element. null: the layout has not mounted it yet. undefined: no layout at all.
export const PageHeaderSlot = createContext<HTMLElement | null | undefined>(undefined)
