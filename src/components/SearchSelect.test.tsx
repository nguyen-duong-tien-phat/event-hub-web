import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { SearchSelect } from './SearchSelect'

const options = [
  { value: 'a', label: 'Attendee' },
  { value: 'o', label: 'Organizer' },
  { value: 'd', label: 'Admin' },
]

function Harness({ onSearchChange }: { onSearchChange?: (t: string) => void }) {
  const [value, setValue] = useState('a')
  return <SearchSelect ariaLabel="Role" value={value} onChange={setValue} options={options} onSearchChange={onSearchChange} />
}

test('typing filters the options, and "No results." shows when nothing matches', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('combobox', { name: 'Role' }))

  await user.type(screen.getByPlaceholderText('Search…'), 'org')
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Organizer'])

  await user.clear(screen.getByPlaceholderText('Search…'))
  await user.type(screen.getByPlaceholderText('Search…'), 'zzz')
  expect(screen.getByText('No results.')).toBeInTheDocument()
})

test('picking an option changes the value and closes the list', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const trigger = screen.getByRole('combobox', { name: 'Role' })
  expect(trigger).toHaveTextContent('Attendee')

  await user.click(trigger)
  await user.click(screen.getByRole('option', { name: 'Organizer' }))

  expect(trigger).toHaveTextContent('Organizer')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('option')).not.toBeInTheDocument()
})

test('with onSearchChange the typed text goes up and the options are not filtered here', async () => {
  const onSearchChange = vi.fn()
  const user = userEvent.setup()
  render(<Harness onSearchChange={onSearchChange} />)
  await user.click(screen.getByRole('combobox', { name: 'Role' }))

  await user.type(screen.getByPlaceholderText('Search…'), 'zz')

  expect(onSearchChange).toHaveBeenLastCalledWith('zz')
  expect(screen.getAllByRole('option')).toHaveLength(3)
})
