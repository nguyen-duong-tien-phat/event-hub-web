import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

// Opens a searchable dropdown by its accessible name and clicks one of its options.
export async function pick(user: UserEvent, dropdown: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: dropdown }))
  await user.click(await screen.findByRole('option', { name: option }))
}
