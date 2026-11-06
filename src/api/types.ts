export type Role = 'Attendee' | 'Organizer' | 'Admin'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
}

// Body of POST /auth/login and POST /auth/refresh.
export interface AuthResponse extends SessionUser {
  token: string
  refreshToken: string
}
