import axios from 'axios'
import { useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { AdminContext } from '../context/AdminContext'
import { DoctorContext } from '../context/DoctorContext'
import { publicEnv } from '../lib/env'
import { isAuthSessionHandledError } from '../api/authClient'

const Security = () => {
  const backendUrl = publicEnv.backendUrl
  const { aToken, setAToken } = useContext(AdminContext)
  const { dToken, setDToken } = useContext(DoctorContext)
  const token = aToken || dToken
  const clearToken = () => {
    if (aToken) {
      window.localStorage.removeItem('aToken')
      setAToken('')
    } else {
      window.localStorage.removeItem('dToken')
      setDToken('')
    }
  }
  const [status, setStatus] = useState(null)
  const [setup, setSetup] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [sessions, setSessions] = useState([])

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  const loadData = useCallback(async () => {
    if (!token) return
    const [statusResponse, sessionsResponse] = await Promise.all([
      axios.get(backendUrl + '/api/v1/auth/2fa/status', { headers: authHeaders() }),
      axios.get(backendUrl + '/api/v1/auth/sessions', { headers: authHeaders() })
    ])
    setStatus(statusResponse.data.data.status)
    setSessions(sessionsResponse.data.data.sessions)
  }, [authHeaders, backendUrl, token])

  useEffect(() => {
    loadData().catch((error) => {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    })
  }, [loadData])

  const beginSetup = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/setup/begin', {}, { headers: authHeaders(), withCredentials: true })
      setSetup(data.data.setup)
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const confirmSetup = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/setup/confirm', { totpCode }, { headers: authHeaders(), withCredentials: true })
      setRecoveryCodes(data.data.recoveryCodes)
      setSetup(null)
      await loadData()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const regenerateCodes = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/recovery-codes/regenerate', { password, totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined }, { headers: authHeaders(), withCredentials: true })
      setRecoveryCodes(data.data.recoveryCodes)
      clearToken()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const disableTwoFactor = async () => {
    try {
      await axios.post(backendUrl + '/api/v1/auth/2fa/disable', { password, totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined }, { headers: authHeaders(), withCredentials: true })
      clearToken()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const revokeSession = async (sessionId) => {
    try {
      await axios.delete(backendUrl + `/api/v1/auth/sessions/${sessionId}`, { headers: authHeaders(), withCredentials: true })
      await loadData()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  const revokeOthers = async () => {
    try {
      await axios.post(backendUrl + '/api/v1/auth/sessions/revoke-others', {}, { headers: authHeaders(), withCredentials: true })
      await loadData()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message)
    }
  }

  return (
    <main className='portal-page max-w-4xl text-slate-600'>
      <div><p className='portal-eyebrow'>Protected workspace</p><h1 className='portal-title'>Security and sessions</h1><p className='mt-2'>Set up an authenticator app and manage the devices signed in to this portal account.</p></div>
      <div className='portal-card p-5 sm:p-6 space-y-4'>
        <div className='flex justify-between gap-3'>
          <p className='text-xl font-semibold text-ink'>Authenticator app</p>
          <span className={`portal-status ${status?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status?.enabled ? '2FA enabled' : '2FA not enabled'}</span>
        </div>
        {!status?.enabled && <button onClick={beginSetup} className='portal-button'>Start setup</button>}
        {setup && <div className='rounded-md border border-line bg-mist p-4 space-y-3'>
          <img className='w-48 h-48 border border-line rounded bg-white' src={setup.qrCodeDataUrl} alt='Authenticator QR code' />
          <textarea readOnly value={setup.otpauthUri} rows='3' className='portal-field font-mono text-xs' />
          <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className='portal-field' placeholder='6-digit code' />
          <button onClick={confirmSetup} className='portal-button'>Confirm setup</button>
        </div>}
        {status?.enabled && <div className='grid gap-3'>
          <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} className='portal-field' placeholder='Password' />
          <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className='portal-field' placeholder='Authenticator code' />
          <input value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} className='portal-field' placeholder='Recovery code' />
          <div className='flex gap-3 flex-wrap'>
            <button onClick={regenerateCodes} className='portal-button-secondary'>Regenerate codes</button>
            <button onClick={disableTwoFactor} className='rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50'>Disable 2FA</button>
          </div>
        </div>}
        {recoveryCodes.length > 0 && <div className='grid sm:grid-cols-2 gap-2 rounded-md border border-amber-200 bg-amber-50 p-4'>{recoveryCodes.map((code) => <code key={code} className='rounded border border-amber-200 bg-white p-2'>{code}</code>)}</div>}
      </div>
      <div className='portal-card p-5 sm:p-6 space-y-3'>
        <div className='flex justify-between gap-3'>
          <p className='text-xl font-semibold text-ink'>Active sessions</p>
          <button onClick={revokeOthers} className='portal-button-secondary'>Revoke others</button>
        </div>
        {sessions.map((session) => <div key={session.sessionId} className='border border-line rounded-md p-4 flex justify-between gap-3'>
          <div>
            <p>{session.displayName || session.device || 'Session'} {session.current ? '(current)' : ''}</p>
            <p className='text-xs text-gray-500'>{new Date(session.lastActiveAt).toLocaleString()}</p>
          </div>
          <button onClick={() => revokeSession(session.sessionId)} className='text-red-700 border border-red-200 rounded-md px-3 py-2 text-sm font-semibold hover:bg-red-50'>Revoke</button>
        </div>)}
      </div>
    </main>
  )
}

export default Security
