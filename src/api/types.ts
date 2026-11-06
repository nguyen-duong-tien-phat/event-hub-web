export const ROLES = ['Attendee', 'Organizer', 'Admin'] as const
export type Role = (typeof ROLES)[number]

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
}

// Every list answers in this shape. Paged with OFFSET, so very deep pages are slow.
export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface UserDto extends SessionUser {
  isActive: boolean
  createdAt: string // UTC
  updatedAt: string // UTC
}

// Body of POST /auth/login and POST /auth/refresh.
export interface AuthResponse extends SessionUser {
  token: string
  refreshToken: string
}
