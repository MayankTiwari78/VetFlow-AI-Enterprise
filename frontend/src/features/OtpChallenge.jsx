import axios from 'axios'
import { useContext, useState } from 'react'
import { Link, useSearchParams } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'
import { Mail, KeyRound, Smartphone } from 'lucide-react'

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
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Mail className='h-4 w-4 text-muted' />
            Email
          </label>
          <input
            id='otp-email'
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className='mf-field mt-1.5'
            type='email'
            required
            placeholder='you@example.com'
          />
        </div>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Smartphone className='h-4 w-4 text-muted' />
            Purpose
          </label>
          <select
            id='otp-purpose'
            onChange={(e) => setPurpose(e.target.value)}
            value={purpose}
            className='mf-field mt-1.5'
          >
            <option value='EMAIL_VERIFICATION'>Email verification</option>
            <option value='PASSWORD_RESET'>Password reset</option>
            <option value='LOGIN_VERIFICATION'>Login verification</option>
          </select>
        </div>
        <button
          disabled={loading || !email}
          type='button'
          onClick={requestCode}
          className='mf-button-secondary w-full py-3'
        >
          {loading ? 'Sending...' : 'Send code'}
        </button>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <KeyRound className='h-4 w-4 text-muted' />
            Code
          </label>
          <input
            id='otp-code'
            onChange={(e) => setOtp(e.target.value)}
            value={otp}
            className='mf-field mt-1.5 text-center tracking-[0.2em]'
            inputMode='numeric'
            maxLength='6'
            required
            placeholder='———'
          />
        </div>
        <button disabled={loading} className='mf-button w-full text-base py-4'>
          {loading ? 'Please wait...' : 'Verify code'}
        </button>
        <Link className='block text-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors' to='/login'>
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  )
}

export default OtpChallenge
