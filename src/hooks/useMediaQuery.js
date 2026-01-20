import { useEffect, useState } from 'react'

const getMatch = (query) => {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false
  return window.matchMedia(query).matches
}

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => getMatch(query))

  useEffect(() => {
    const mediaQueryList = typeof window !== 'undefined' ? window.matchMedia(query) : null
    if (!mediaQueryList) return undefined

    const listener = (event) => setMatches(event.matches)
    mediaQueryList.addEventListener('change', listener)
    setMatches(mediaQueryList.matches)

    return () => mediaQueryList.removeEventListener('change', listener)
  }, [query])

  return matches
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
