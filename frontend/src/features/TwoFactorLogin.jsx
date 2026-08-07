import axios from 'axios'
import { useContext, useState } from 'react'
import { useNavigate } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'
import { resetSessionExpiredNotification } from '../api/authClient'
import { safeLoginDestination } from '../lib/authNavigation'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

const TwoFactorLogin = () => {
  const navigate = useNavigate()
  const { backendUrl, setToken } = useContext(AppContext)
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const challenge = JSON.parse(sessionStorage.getItem('patientTwoFactorChallenge') || '{}')

    if (!challenge.twoFactorToken) {
      toast.error('Two-factor challenge expired')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post(
        backendUrl + '/api/v1/auth/2fa/login/verify',
        {
          twoFactorToken: challenge.twoFactorToken,
          totpCode: totpCode || undefined,
          recoveryCode: recoveryCode || undefined
        },
        { withCredentials: true }
      )

      if (data.success) {
        resetSessionExpiredNotification()
        setToken(data.token)
        sessionStorage.removeItem('patientTwoFactorChallenge')
        navigate(safeLoginDestination(challenge.returnTo))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow='Protected sign in' title='Two-factor verification' description='Use your authenticator app or one unused recovery code to complete this sign-in.'>
      <form onSubmit={onSubmit} className='space-y-4 text-sm text-slate-600'>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <KeyRound className='h-4 w-4 text-muted' />
            Authenticator code
          </label>
          <input
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            className='mf-field mt-1.5 text-center tracking-[0.2em]'
            inputMode='numeric'
            maxLength='6'
            placeholder='———'
          />
        </div>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <KeyRound className='h-4 w-4 text-muted' />
            Recovery code
          </label>
          <input
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            className='mf-field mt-1.5'
            placeholder='Enter a recovery code'
          />
        </div>
        <button disabled={loading || (!totpCode && !recoveryCode)} className='mf-button w-full my-1 text-base py-4'>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </AuthShell>
  )
}

export default TwoFactorLogin
