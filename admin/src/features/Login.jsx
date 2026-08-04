import axios from 'axios'
import { useContext, useState } from 'react'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { toast } from 'react-toastify'
import { publicEnv } from '../lib/env'
import BrandLogo from '../components/BrandLogo'
import { resetPortalSessionExpiredNotification } from '../api/authClient'

const Login = () => {

  const [state, setState] = useState('Admin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')

  const backendUrl = publicEnv.backendUrl

  const { setDToken } = useContext(DoctorContext)
  const { setAToken } = useContext(AdminContext)

  const persistLogin = (role, data) => {
    resetPortalSessionExpiredNotification()
    if (role === 'Admin') {
      setAToken(data.token)
      window.localStorage.setItem('aToken', data.token)
    } else {
      setDToken(data.token)
      window.localStorage.setItem('dToken', data.token)
    }
  }

  const handleLoginResponse = (role, data) => {
    if (data.success && data.data?.requiresTwoFactor) {
      setChallenge({ role, ...data.data })
      return
    }

    if (data.success) {
      persistLogin(role, data)
    } else {
      toast.error(data.message)
    }
  }

  const verifyChallenge = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/2fa/login/verify', {
        twoFactorToken: challenge.twoFactorToken,
        totpCode: totpCode || undefined,
        recoveryCode: recoveryCode || undefined
      }, { withCredentials: true })
      handleLoginResponse(challenge.role, data)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true)
    try {
      if (state === 'Admin') {

        const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password }, { withCredentials: true })
        handleLoginResponse('Admin', data)

      } else {

        const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password }, { withCredentials: true })
        handleLoginResponse('Doctor', data)

      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }

  }

  return (
    <form onSubmit={challenge ? verifyChallenge : onSubmitHandler} className='min-h-screen bg-[#EAF5F6] flex items-center p-5'>
      <div className='portal-card flex w-full max-w-md flex-col gap-4 m-auto items-start p-7 sm:p-9 text-slate-600 text-sm'>
        <BrandLogo />
        <div><p className='portal-eyebrow'>MedFlow AI enterprise</p><h1 className='portal-title'><span className='text-primary'>{challenge?.role || state}</span> {challenge ? 'verification' : 'sign in'}</h1></div>
        <p className='leading-6'>Use your authorized portal account to continue to the protected healthcare workspace.</p>
        {challenge ? <>
          <div className='w-full'>
            <p className='font-semibold text-slate-700'>Authenticator code</p>
            <input onChange={(e) => setTotpCode(e.target.value)} value={totpCode} className='portal-field mt-1' inputMode='numeric' maxLength='6' />
          </div>
          <div className='w-full'>
            <p className='font-semibold text-slate-700'>Recovery code</p>
            <input onChange={(e) => setRecoveryCode(e.target.value)} value={recoveryCode} className='portal-field mt-1' />
          </div>
          <button disabled={loading || (!totpCode && !recoveryCode)} className='portal-button w-full text-base'>{loading ? 'Verifying...' : 'Verify'}</button>
          <p><span onClick={() => setChallenge(null)} className='text-primary underline cursor-pointer'>Back to login</span></p>
        </> : <>
          <div className='w-full '>
            <label className='font-semibold text-slate-700' htmlFor='portal-email'>Email</label>
            <input id='portal-email' onChange={(e) => setEmail(e.target.value)} value={email} className='portal-field mt-1' type="email" required />
          </div>
          <div className='w-full '>
            <label className='font-semibold text-slate-700' htmlFor='portal-password'>Password</label>
            <input id='portal-password' onChange={(e) => setPassword(e.target.value)} value={password} className='portal-field mt-1' type="password" required />
          </div>
          <button disabled={loading} className='portal-button w-full text-base'>{loading ? 'Please wait...' : 'Login'}</button>
          {
            state === 'Admin'
              ? <p>Doctor Login? <span onClick={() => setState('Doctor')} className='text-primary underline cursor-pointer'>Click here</span></p>
              : <p>Admin Login? <span onClick={() => setState('Admin')} className='text-primary underline cursor-pointer'>Click here</span></p>
          }
        </>}
      </div>
    </form>
  )
}

export default Login
