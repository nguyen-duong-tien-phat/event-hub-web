import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { CopyButton } from './CopyButton'

afterEach(() => vi.unstubAllGlobals())

function setup(writeText: (text: string) => Promise<void>) {
  const user = userEvent.setup() // before the clipboard stub: user-event installs its own clipboard
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  const onRowClick = vi.fn()
  render(
    <div onClick={onRowClick}>
      <CopyButton value="booking_abc123" label="booking id" />
      <Toaster />
    </div>,
  )
  return { user, onRowClick }
}

test('copies the value, says so, and does not click through to the row', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  const { user, onRowClick } = setup(writeText)

  await user.click(screen.getByRole('button', { name: 'Copy booking id' }))

  expect(writeText).toHaveBeenCalledWith('booking_abc123')
  expect(await screen.findByText('booking id copied')).toBeInTheDocument()
  expect(onRowClick).not.toHaveBeenCalled()
})

test('says so when the clipboard refuses', async () => {
  const { user } = setup(vi.fn().mockRejectedValue(new Error('denied')))

  await user.click(screen.getByRole('button', { name: 'Copy booking id' }))

  expect(await screen.findByText('Could not copy')).toBeInTheDocument()
})
