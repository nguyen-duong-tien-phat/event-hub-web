import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import { AuthContext } from '@/auth/useAuth'
import { AppLayout } from './AppLayout'
import { PageHeader } from './PageHeader'
import { PageHeaderSlot } from './pageHeaderSlot'

test('renders the h1 and the action in place when there is no layout', () => {
  const { container } = render(<PageHeader title="Users" actions={<button>New</button>} />)
  expect(within(container).getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument()
  expect(within(container).getByRole('button', { name: 'New' })).toBeInTheDocument()
})

test('renders nothing until the layout has mounted its header', () => {
  const { container } = render(
    <PageHeaderSlot.Provider value={null}>
      <PageHeader title="Users" />
    </PageHeaderSlot.Provider>,
  )
  expect(container).toBeEmptyDOMElement()
})

test('puts the title and action into the layout header, not the page body', () => {
  const auth = {
    user: { id: 'u1', email: 'a@b.c', fullName: 'Ann Tran', role: 'Admin' as const },
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<PageHeader title="Events" actions={<button>New event</button>} />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  const header = screen.getByRole('banner')
  expect(within(header).getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
  expect(within(header).getByRole('button', { name: 'New event' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  // The account block now closes the sidebar.
  expect(within(screen.getByRole('complementary')).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})
