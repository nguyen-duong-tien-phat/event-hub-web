import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import type { Role } from '@/api/types'
import { RequireRole } from './RequireRole'
import { AuthContext } from './useAuth'

function renderAs(role: Role, allowed: Role[], redirectTo?: string) {
  const auth = {
    user: { id: 'u1', email: 'a@b.c', fullName: 'Ann', role },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireRole roles={allowed} redirectTo={redirectTo} />}>
            <Route index element={<p>secret page</p>} />
          </Route>
          <Route path="/events" element={<p>events page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

test('lets a listed role through', () => {
  renderAs('Admin', ['Admin'])
  expect(screen.getByText('secret page')).toBeInTheDocument()
})

test('blocks any other role and offers to sign out', () => {
  renderAs('Organizer', ['Admin'])
  expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

test('redirects a signed-in user without the role when redirectTo is set', () => {
  renderAs('Organizer', ['Admin'], '/events')
  expect(screen.getByText('events page')).toBeInTheDocument()
  expect(screen.queryByText('secret page')).not.toBeInTheDocument()
})
