import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { expect, test } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

test('switches the page between the light and the dark theme', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  render(
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <ThemeToggle />
    </ThemeProvider>,
  )

  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
  expect(document.documentElement).toHaveClass('dark')

  await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
  expect(document.documentElement).not.toHaveClass('dark')
})
