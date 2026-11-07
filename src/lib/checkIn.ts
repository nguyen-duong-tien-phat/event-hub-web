// "K7Q49XMD" is easier to read and say as "K7Q4 9XMD"; the copied value stays the raw code.
export const groupCode = (code: string) => code.replace(/(.{4})(?=.)/g, '$1 ')

// "Checked in" when everyone is in, else "1 of 3 checked in"; null while nobody is.
export const checkInSummary = (checkedIn: number, total: number) =>
  checkedIn === 0 ? null : checkedIn >= total ? 'Checked in' : `${checkedIn} of ${total} checked in`
