import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { currentPathWithSearch, loginHrefForReturnTo } from '../lib/authNavigation'

let lastProtectedRedirect = ''

export const resetProtectedPatientRouteRedirectForTests = () => {
  lastProtectedRedirect = ''
}

export const useProtectedPatientRoute = ({ authStatus, token }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (authStatus === 'initializing' || token) {
      lastProtectedRedirect = ''
      return
    }

    const returnTo = currentPathWithSearch(pathname || '/', searchParams)
    const loginHref = loginHrefForReturnTo(returnTo)

    if (lastProtectedRedirect === loginHref) {
      return
    }

    lastProtectedRedirect = loginHref
    router.replace(loginHref)
  }, [authStatus, pathname, router, searchParams, token])
}
