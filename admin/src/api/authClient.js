import axios from 'axios'
import { toast } from 'react-toastify'

let configured = false
let backendBaseUrl = ''
let setAdminToken = () => {}
let setDoctorToken = () => {}
let onPortalAuthCleared = () => {}
let refreshPromise = null
let sessionExpiredToastShown = false

const tokenKeyForRole = (role) => (role === 'doctor' ? 'dToken' : 'aToken')
const headerForRole = (role) => (role === 'doctor' ? 'dToken' : 'aToken')
const refreshEndpointForRole = (role) =>
  role === 'doctor' ? '/api/v1/auth/refresh/doctor' : '/api/v1/auth/refresh/admin'
const sessionExpiredToastId = 'portal-session-expired'
const inBrowser = () => typeof window !== 'undefined'

const roleForUrl = (url = '') => {
  if (url.includes('/api/doctor/')) {
    return 'doctor'
  }

  if (url.includes('/api/admin/')) {
    return 'admin'
  }

  return null
}

const authEndpoint = (url = '') => url.includes('/api/v1/auth/')
const refreshEndpoint = (url = '') =>
  url.includes('/api/v1/auth/refresh') ||
  url.includes('/api/v1/auth/refresh/doctor') ||
  url.includes('/api/v1/auth/refresh/admin')

export const resetPortalSessionExpiredNotification = () => {
  sessionExpiredToastShown = false
}

const notifySessionExpired = () => {
  if (sessionExpiredToastShown || toast.isActive(sessionExpiredToastId)) {
    return
  }

  sessionExpiredToastShown = true
  toast.error('Your session has expired. Please log in again.', { toastId: sessionExpiredToastId })
}

export const isAuthSessionHandledError = (error) =>
  Boolean(error?.__authSessionHandled || error?.config?._authSessionHandled)

const markSessionHandled = (error) => {
  if (error) {
    error.__authSessionHandled = true
  }

  if (error?.config) {
    error.config._authSessionHandled = true
  }
}

const persistToken = (role, token) => {
  if (inBrowser()) {
    window.localStorage.setItem(tokenKeyForRole(role), token)
  }

  if (role === 'doctor') {
    setDoctorToken(token)
  } else {
    setAdminToken(token)
  }
}

const clearTokens = () => {
  if (inBrowser()) {
    window.localStorage.removeItem('aToken')
    window.localStorage.removeItem('dToken')
  }
  setAdminToken('')
  setDoctorToken('')
  onPortalAuthCleared()
}

const refreshTokenForRole = async (expectedRole) => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        backendBaseUrl + refreshEndpointForRole(expectedRole),
        {},
        { withCredentials: true, skipAuthRefresh: true }
      )
      .then(({ data }) => {
        const role = data?.data?.account?.role
        const token = data?.data?.accessToken || data?.data?.token || data?.token

        if (!token || role !== expectedRole) {
          throw new Error('Unable to refresh session')
        }

        persistToken(role, token)
        return token
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export const configureAdminAuth = ({ backendUrl, setAToken, setDToken, onAuthCleared } = {}) => {
  backendBaseUrl = backendUrl
  setAdminToken = setAToken || setAdminToken
  setDoctorToken = setDToken || setDoctorToken
  onPortalAuthCleared = onAuthCleared || onPortalAuthCleared
  axios.defaults.withCredentials = true

  if (configured) {
    return
  }

  configured = true

  axios.interceptors.request.use((config) => {
    config.withCredentials = true

    const url = String(config.url || '')
    const role = roleForUrl(url)

    if (role) {
      const token = inBrowser() ? window.localStorage.getItem(tokenKeyForRole(role)) : null

      if (token) {
        const header = headerForRole(role)
        config.headers = {
          ...config.headers,
          [header]: config.headers?.[header] || token
        }
      }
    }

    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config
      const url = String(original?.url || '')
      const role = roleForUrl(url)

      if (
        !original ||
        original.skipAuthRefresh ||
        original._retry ||
        refreshEndpoint(url) ||
        authEndpoint(url) ||
        !role ||
        error.response?.status !== 401
      ) {
        return Promise.reject(error)
      }

      original._retry = true

      try {
        const token = await refreshTokenForRole(role)
        original.headers = {
          ...original.headers,
          [headerForRole(role)]: token
        }
        return axios(original)
      } catch {
        clearTokens()
        notifySessionExpired()
        markSessionHandled(error)
        return Promise.reject(error)
      }
    }
  )
}

const logoutRole = () => {
  if (inBrowser()) {
    if (window.localStorage.getItem('dToken')) {
      return 'doctor'
    }
    if (window.localStorage.getItem('aToken')) {
      return 'admin'
    }
  }
  return 'admin'
}

export const logoutAdminSession = async (backendUrl) => {
  const role = logoutRole()
  try {
    await axios.post(
      backendUrl + `/api/v1/auth/logout/${role}`,
      {},
      { withCredentials: true, skipAuthRefresh: true }
    )
  } finally {
    clearTokens()
  }
}
