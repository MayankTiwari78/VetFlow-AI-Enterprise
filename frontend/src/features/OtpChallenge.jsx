import axios from 'axios'
import { useContext, useState } from 'react'
import { Link, useSearchParams } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'

const allowedPurposes = ['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION']

const OtpChallenge = () => {
  const { backendUrl } = useContext(AppContext)
  const [searchParams] = useSearchParams()
  const initialPurpose = searchParams.get('purpose')
  const [purpose, setPurpose] = useState(allowedPurposes.includes(initialPurpose) ? initialPurpose : 'EMAIL_VERIFICATION')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const requestCode = async () => {
    setLoading(true)

    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/otp/request', { email, purpose }, { withCredentials: true })
      toast.success(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/otp/verify', { email, purpose, otp }, { withCredentials: true })
      toast.success(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow='Identity check' title='Verification code' description='Request a short-lived code for the action you need to complete.'>
    <form onSubmit={verifyCode} className='space-y-4'>
        <div className='w-full'>
          <label className='mf-label' htmlFor='otp-email'>Email</label>
          <input id='otp-email' onChange={(e) => setEmail(e.target.value)} value={email} className='mf-field' type='email' required />
        </div>
        <div className='w-full'>
          <label className='mf-label' htmlFor='otp-purpose'>Purpose</label>
          <select id='otp-purpose' onChange={(e) => setPurpose(e.target.value)} value={purpose} className='mf-field'>
            <option value='EMAIL_VERIFICATION'>Email verification</option>
            <option value='PASSWORD_RESET'>Password reset</option>
            <option value='LOGIN_VERIFICATION'>Login verification</option>
          </select>
        </div>
        <button disabled={loading || !email} type='button' onClick={requestCode} className='mf-button-secondary w-full'>Send code</button>
        <div className='w-full'>
          <label className='mf-label' htmlFor='otp-code'>Code</label>
          <input id='otp-code' onChange={(e) => setOtp(e.target.value)} value={otp} className='mf-field tracking-[0.2em]' inputMode='numeric' maxLength='6' required />
        </div>
        <button disabled={loading} className='mf-button w-full'>{loading ? 'Please wait...' : 'Verify code'}</button>
        <Link className='block text-center text-sm font-semibold text-primary' to='/login'>Back to sign in</Link>
    </form>
    </AuthShell>
  )
}

export default OtpChallenge
