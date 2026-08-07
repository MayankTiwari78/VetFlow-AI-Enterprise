import axios from 'axios'
import { useContext, useState } from 'react'
import { Link, useNavigate, useSearchParams } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'
import { Lock, Eye, EyeOff } from 'lucide-react'

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const token = searchParams.get('token') || ''
      const { data } = await axios.post(
        backendUrl + '/api/v1/auth/reset-password',
        { token, password, confirmPassword },
        { withCredentials: true }
      )
      toast.success(data.message)
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow='Account recovery' title='Choose a new password' description='Use a strong password you have not used for this account before.'>
      <form onSubmit={onSubmitHandler} className='space-y-5'>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Lock className='h-4 w-4 text-muted' />
            New password
          </label>
          <div className='relative mt-1.5'>
            <input
              id='new-password'
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className='mf-field pr-12'
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              required
              placeholder='At least 8 characters'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink hover:bg-primary/5 transition-all'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Lock className='h-4 w-4 text-muted' />
            Confirm password
          </label>
          <div className='relative mt-1.5'>
            <input
              id='confirm-new-password'
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              className='mf-field pr-12'
              type={showConfirm ? 'text' : 'password'}
              autoComplete='new-password'
              required
              placeholder='Confirm your password'
            />
            <button
              type='button'
              onClick={() => setShowConfirm(!showConfirm)}
              className='absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink hover:bg-primary/5 transition-all'
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>
        <button disabled={loading} className='mf-button w-full text-base py-4'>
          {loading ? 'Please wait...' : 'Update password'}
        </button>
        <Link className='block text-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors' to='/login'>
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
