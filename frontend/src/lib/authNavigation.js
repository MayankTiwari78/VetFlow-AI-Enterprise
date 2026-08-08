export const defaultReturnTo = '/dashboard'

const hasControlCharacter = (value) => /[\u0000-\u001F\u007F]/u.test(value)

export const isSafeInternalReturnTo = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    return false
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return false
  }

  if (hasControlCharacter(value)) {
    return false
  }

  try {
    const parsed = new URL(value, 'http://medflow.local')
    return parsed.origin === 'http://medflow.local'
  } catch {
    return false
  }
}

export const normalizeReturnTo = (value, fallback = defaultReturnTo) =>
  isSafeInternalReturnTo(value) ? value : fallback

export const currentPathWithSearch = (pathname = '/', searchParams) => {
  const path = isSafeInternalReturnTo(pathname) ? pathname : defaultReturnTo
  const search = searchParams?.toString?.()
  return search ? `${path}?${search}` : path
}

export const loginHrefForReturnTo = (returnTo) =>
  `/login?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`

export const safeLoginDestination = (returnTo, fallback = defaultReturnTo) => {
  const safeReturnTo = normalizeReturnTo(returnTo, fallback)
  return safeReturnTo === '/login' || safeReturnTo.startsWith('/login?') || safeReturnTo.startsWith('/login#')
    ? fallback
    : safeReturnTo
}
