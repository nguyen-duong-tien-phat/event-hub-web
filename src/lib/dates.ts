const pad = (n: number) => String(n).padStart(2, '0')

/** UTC ISO string from the API to the value of an <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The value of an <input type="datetime-local"> (browser time zone) to a UTC ISO string for the API. */
export const fromLocalInput = (value: string) => new Date(value).toISOString()

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
