import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listUsers } from '@/api/users'
import type { SearchOption } from '@/components/SearchSelect'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

// Options for an organizer picker: the API searches active organizers by name or email, 20 at a time.
export function useOrganizerSearch(enabled = true) {
  const [text, setText] = useState('')
  const search = useDebouncedValue(text.trim(), 300)
  const query = useQuery({
    queryKey: ['users', 'organizers', search],
    queryFn: () => listUsers({ search, role: 'Organizer', isActive: true, page: 1, pageSize: 20 }),
    enabled,
    placeholderData: keepPreviousData,
  })
  const options: SearchOption[] = query.data?.items.map((o) => ({ value: o.id, label: o.fullName })) ?? []
  return { options, onSearchChange: setText, loading: query.isFetching }
}
