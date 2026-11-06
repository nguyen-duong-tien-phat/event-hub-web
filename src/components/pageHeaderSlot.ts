import { createContext } from 'react'

// The layout's header element. null: the layout has not mounted it yet. undefined: no layout at all.
export const PageHeaderSlot = createContext<HTMLElement | null | undefined>(undefined)

// The layout's footer bar under the scrolling content, for a page's main actions (Save, Cancel). Same meaning as above.
export const PageFooterSlot = createContext<HTMLElement | null | undefined>(undefined)
