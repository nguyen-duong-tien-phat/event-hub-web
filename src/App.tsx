import { Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRole } from '@/auth/RequireRole'
import { AppLayout } from '@/components/AppLayout'
import { EventsPage } from '@/features/events/EventsPage'
import { LoginPage } from '@/features/login/LoginPage'
import { UsersPage } from '@/features/users/UsersPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={['Admin', 'Organizer']} />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/events" replace />} />
              <Route path="events" element={<EventsPage />} />
              <Route element={<RequireRole roles={['Admin']} />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<p>Page not found.</p>} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
