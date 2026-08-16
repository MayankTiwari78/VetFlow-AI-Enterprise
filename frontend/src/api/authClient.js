import axios from 'axios'
import { toast } from 'react-toastify'

let configured = false
let backendBaseUrl = ''
let setPatientToken = () => {}
let onPatientAuthCleared = () => {}
let refreshPromise = null
let bootstrapPromise = null
let bootstrapBackendUrl = ''
let requestInterceptorId = null
let responseInterceptorId = null
let sessionExpiredToastShown = false

const patientTokenKey = 'token'
const sessionExpiredToastId = 'patient-session-expired'
const inBrowser = () => typeof window !== 'undefined'

const endpointPath = (url = '') => {
  try {
    return new URL(url, backendBaseUrl || 'http://localhost').pathname
  } catch {
    return String(url || '')
  }
}

const isLegacyPublicAuthEndpoint = (path = '') =>
  ['/api/user/login', '/api/user/register'].includes(path)

const isRefreshEndpoint = (path = '') =>
  path === '/api/v1/auth/refresh' ||
  path === '/api/v1/auth/refresh/patient' ||
  path === '/api/v1/auth/refresh/doctor' ||
  path === '/api/v1/auth/refresh/admin'

const isPublicAuthEndpoint = (path = '') =>
  isLegacyPublicAuthEndpoint(path) ||
  [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/patient/login',
    '/api/v1/auth/doctor/login',
    '/api/v1/auth/admin/login',
    '/api/v1/auth/2fa/login/verify',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/resend-verification',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/otp/request',
    '/api/v1/auth/otp/verify'
  ].includes(path)

const isProtectedPatientEndpoint = (path = '') =>
  path.startsWith('/api/user/') && !isLegacyPublicAuthEndpoint(path)

const isProtectedAuthEndpoint = (path = '') =>
  path.startsWith('/api/v1/auth/') && !isRefreshEndpoint(path) && !isPublicAuthEndpoint(path)

const isProtectedVeterinaryEndpoint = (path = '') =>
  path.startsWith('/api/v1/veterinary/')

const canRefreshRequest = (path = '') =>
  isProtectedPatientEndpoint(path) || isProtectedAuthEndpoint(path) || isProtectedVeterinaryEndpoint(path)

const persistToken = (token) => {
  if (inBrowser()) {
    window.localStorage.setItem(patientTokenKey, token)
  }
  setPatientToken(token)
}

const clearToken = ({ notify = false } = {}) => {
  if (inBrowser()) {
    window.localStorage.removeItem(patientTokenKey)
  }
  setPatientToken('')
  if (notify) {
    onPatientAuthCleared()
  }
}

export const resetSessionExpiredNotification = () => {
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

const refreshPatientToken = async ({ persist = true, optional = false } = {}) => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        backendBaseUrl + '/api/v1/auth/refresh/patient',
        {},
        { withCredentials: true, skipAuthRefresh: true, optionalAuthRequest: optional }
      )
      .then(({ data }) => {
        const nextToken = data?.data?.accessToken || data?.data?.token || data?.token

        if (!nextToken) {
          throw new Error('Unable to refresh session')
        }

        if (persist) {
          persistToken(nextToken)
        }

        return nextToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export const bootstrapPatientSession = async (backendUrl) => {
  if (!bootstrapPromise || bootstrapBackendUrl !== backendUrl) {
    bootstrapBackendUrl = backendUrl
    bootstrapPromise = refreshPatientToken({ persist: false, optional: true })
      .then((token) => ({ status: 'authenticated', token }))
      .catch((error) => {
        if (error?.response?.status === 401) {
          clearToken()
          return { status: 'unauthenticated', token: '' }
        }

        throw error
      })
  }

  return bootstrapPromise
}

export const configurePatientAuth = ({ backendUrl, setToken, onAuthCleared } = {}) => {
  backendBaseUrl = backendUrl
  setPatientToken = setToken || setPatientToken
  onPatientAuthCleared = onAuthCleared || onPatientAuthCleared
  axios.defaults.withCredentials = true

  if (configured) {
    return
  }

  configured = true

  requestInterceptorId = axios.interceptors.request.use((config) => {
    config.withCredentials = true

    const path = endpointPath(config.url)
    const token = inBrowser() ? window.localStorage.getItem(patientTokenKey) : null

    if (token && isProtectedPatientEndpoint(path)) {
      config.headers = {
        ...config.headers,
        token: config.headers?.token || token
      }
    }

    if (token && isProtectedAuthEndpoint(path)) {
      config.headers = {
        ...config.headers,
        Authorization: config.headers?.Authorization || `Bearer ${token}`
      }
    }

    if (token && isProtectedVeterinaryEndpoint(path)) {
      config.headers = {
        ...config.headers,
        Authorization: config.headers?.Authorization || `Bearer ${token}`
      }
    }

    return config
  })

  responseInterceptorId = axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config
      const path = endpointPath(original?.url)

      if (
        !original ||
        original.skipAuthRefresh ||
        original.optionalAuthRequest ||
        original._retry ||
        isRefreshEndpoint(path) ||
        !canRefreshRequest(path) ||
        error.response?.status !== 401
      ) {
        return Promise.reject(error)
      }

      original._retry = true

      try {
        const token = await refreshPatientToken()
        original.headers = {
          ...original.headers,
          ...(isProtectedPatientEndpoint(path) ? { token } : {}),
          ...(isProtectedAuthEndpoint(path) ? { Authorization: `Bearer ${token}` } : {}),
          ...(isProtectedVeterinaryEndpoint(path) ? { Authorization: `Bearer ${token}` } : {})
        }
        return axios(original)
      } catch {
        clearToken({ notify: true })
        notifySessionExpired()
        markSessionHandled(error)
        return Promise.reject(error)
      }
    }
  )
}

export const logoutPatientSession = async (backendUrl) => {
  try {
    await axios.post(
      backendUrl + '/api/v1/auth/logout/patient',
      {},
      { withCredentials: true, skipAuthRefresh: true }
    )
  } finally {
    clearToken({ notify: true })
  }
}

export const resetPatientAuthClientForTests = () => {
  if (requestInterceptorId !== null) {
    axios.interceptors.request.eject(requestInterceptorId)
  }

  if (responseInterceptorId !== null) {
    axios.interceptors.response.eject(responseInterceptorId)
  }

  configured = false
  backendBaseUrl = ''
  setPatientToken = () => {}
  onPatientAuthCleared = () => {}
  refreshPromise = null
  bootstrapPromise = null
  bootstrapBackendUrl = ''
  requestInterceptorId = null
  responseInterceptorId = null
  sessionExpiredToastShown = false
}