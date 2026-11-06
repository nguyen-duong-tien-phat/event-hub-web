import { useLocation, useNavigate } from 'react-router'

// Back to wherever the user came from. A page opened directly has no earlier entry in this app
// (react-router calls its first location key "default"), so it goes to `fallback` instead.
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const canGoBack = useLocation().key !== 'default'
  return {
    canGoBack,
    goBack: () => {
      if (canGoBack) void navigate(-1)
      else void navigate(fallback)
    },
  }
}
