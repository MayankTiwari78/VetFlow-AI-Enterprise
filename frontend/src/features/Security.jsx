import axios from 'axios'
import { useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import { isAuthSessionHandledError } from '../api/authClient'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const Security = () => {
  const { authStatus, backendUrl, token, setToken } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })
  const [status, setStatus] = useState(null)
  const [setup, setSetup] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  const loadSecurity = useCallback(async () => {
    if (!token) return
    const [statusResponse, sessionsResponse] = await Promise.all([
      axios.get(backendUrl + '/api/v1/auth/2fa/status', { headers: authHeader(token) }),
      axios.get(backendUrl + '/api/v1/auth/sessions', { headers: authHeader(token) })
    ])
    setStatus(statusResponse.data.data.status)
    setSessions(sessionsResponse.data.data.sessions)
  }, [backendUrl, token])

  useEffect(() => {
    loadSecurity().catch((error) => {
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message)
      }
    })
  }, [loadSecurity])

  const beginSetup = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/setup/begin', {}, { headers: authHeader(token), withCredentials: true })
      setSetup(data.data.setup)
      toast.success(data.message)
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const confirmSetup = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/setup/confirm', { totpCode }, { headers: authHeader(token), withCredentials: true })
      setRecoveryCodes(data.data.recoveryCodes)
      setSetup(null)
      setTotpCode('')
      await loadSecurity()
      toast.success(data.message)
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    setLoading(true)
    try {
      await axios.post(backendUrl + '/api/v1/auth/2fa/disable', { password, totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined }, { headers: authHeader(token), withCredentials: true })
      localStorage.removeItem('token')
      setToken('')
      toast.success('Two-factor authentication disabled. Please log in again.')
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const regenerateCodes = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/recovery-codes/regenerate', { password, totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined }, { headers: authHeader(token), withCredentials: true })
      setRecoveryCodes(data.data.recoveryCodes)
      localStorage.removeItem('token')
      setToken('')
      toast.success('Recovery codes regenerated. Please log in again.')
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (sessionId) => {
    try {
      await axios.delete(backendUrl + `/api/v1/auth/sessions/${sessionId}`, { headers: authHeader(token), withCredentials: true })
      await loadSecurity()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const revokeOthers = async () => {
    try {
      await axios.post(backendUrl + '/api/v1/auth/sessions/revoke-others', {}, { headers: authHeader(token), withCredentials: true })
      await loadSecurity()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  if (authStatus === 'initializing') {
    return <div className='max-w-4xl mx-auto py-10 space-y-7'><div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='h-72 animate-pulse rounded-lg bg-white' /></div>
  }

  if (!token) {
    return <div className='max-w-4xl mx-auto py-10 space-y-7'><div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='h-72 animate-pulse rounded-lg bg-white' /></div>
  }

  return (
    <div className='max-w-4xl mx-auto py-10 space-y-7 text-slate-600'>
      <div><p className='mf-eyebrow'>Account protection</p><h1 className='mf-title'>Security center</h1><p className='mf-copy'>Protect your MedFlow AI account with an authenticator app and review every signed-in device.</p></div>
      <div className='mf-card p-5 sm:p-6 space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <p className='text-xl font-semibold text-ink'>Authenticator app</p>
          <span className={`mf-status ${status?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status?.enabled ? '2FA enabled' : '2FA not enabled'}</span>
        </div>
        {!status?.enabled && <button disabled={loading} onClick={beginSetup} className='mf-button'>Start authenticator setup</button>}
        {setup && <div className='rounded-md border border-line bg-mist p-4 space-y-3'>
          <img className='w-48 h-48 border border-line rounded bg-white' src={setup.qrCodeDataUrl} alt='Authenticator QR code' />
          <textarea readOnly value={setup.otpauthUri} className='mf-field font-mono text-xs' rows='3' />
          <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className='mf-field' placeholder='6-digit code' />
          <button disabled={loading || totpCode.length !== 6} onClick={confirmSetup} className='mf-button'>Confirm setup</button>
        </div>}
        {status?.enabled && <div className='grid gap-3'>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type='password' className='mf-field' placeholder='Password' />
          <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className='mf-field' placeholder='Authenticator code' />
          <input value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} className='mf-field' placeholder='Recovery code' />
          <div className='flex gap-3 flex-wrap'>
            <button disabled={loading} onClick={regenerateCodes} className='mf-button-secondary'>Regenerate recovery codes</button>
            <button disabled={loading} onClick={disableTwoFactor} className='inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60'>Disable 2FA</button>
          </div>
        </div>}
        {recoveryCodes.length > 0 && <div className='bg-amber-50 border border-amber-200 rounded-md p-4'>
          <p className='font-semibold text-amber-950 mb-2'>Recovery codes</p>
          <div className='grid sm:grid-cols-2 gap-2 text-sm'>{recoveryCodes.map((code) => <code key={code} className='bg-white border border-amber-200 rounded p-2'>{code}</code>)}</div>
        </div>}
      </div>

      <div className='mf-card p-5 sm:p-6 space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <p className='text-xl font-semibold text-ink'>Active sessions</p>
          <button onClick={revokeOthers} className='mf-button-secondary'>Revoke others</button>
        </div>
        <div className='space-y-3'>{sessions.map((session) => <div key={session.sessionId} className='rounded-md border border-line p-4 flex items-center justify-between gap-3'>
          <div>
            <p className='font-medium'>{session.displayName || session.device || 'Session'} {session.current ? '(current)' : ''}</p>
            <p className='text-xs text-gray-500'>Last active {new Date(session.lastActiveAt).toLocaleString()}</p>
          </div>
          <button onClick={() => revokeSession(session.sessionId)} className='rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50'>Revoke</button>
        </div>)}</div>
      </div>
    </div>
  )
}

export default Security
