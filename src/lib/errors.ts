import { ApiError } from '@/api/client'

// Text for a toast or an inline message. A 500 carries a traceId that finds the line in the API log.
export function describeError(e: unknown) {
  if (!(e instanceof ApiError)) return 'Something went wrong. Please try again.'
  return e.traceId ? `${e.message} (ref ${e.traceId})` : e.message
}
