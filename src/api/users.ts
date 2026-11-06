import { api } from './client'
import type { Paged, Role, UserDto } from './types'

export interface UserFilters {
  search: string
  isActive?: boolean // left out: both active and blocked
  role?: Role
  page: number
  pageSize: number
}

export function listUsers({ search, isActive, role, page, pageSize }: UserFilters) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search) query.set('search', search)
  if (isActive !== undefined) query.set('isActive', String(isActive))
  if (role) query.set('role', role)
  return api<Paged<UserDto>>(`/users?${query}`)
}

export const getUser = (id: string) => api<UserDto>(`/users/${id}`)

// 409 when the email is taken.
export const createUser = (body: { fullName: string; email: string; password: string; role: Role }) =>
  api<UserDto>('/users', { method: 'POST', body })

export const changeRole = (id: string, role: Role) =>
  api<UserDto>(`/users/${id}/role`, { method: 'PATCH', body: { role } })

export const setActive = (id: string, isActive: boolean) =>
  api<UserDto>(`/users/${id}/active`, { method: 'PATCH', body: { isActive } })
