import { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useSearchParams } from '../lib/routerCompat'
import AuthShell from '../components/AuthShell'
import { resetSessionExpiredNotification } from '../api/authClient'
import { safeLoginDestination } from '../lib/authNavigation'
import { Eye, EyeOff, Mail, Lock, Globe2, Apple } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const loginNavigationStarted = useRef(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const destination = safeLoginDestination(searchParams.get('returnTo'))
  const { authStatus, backendUrl, token, setToken } = useContext(AppContext)

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const { data } = await axios.post(backendUrl + '/api/user/login', { email, password }, { withCredentials: true })

      if (data.success && data.data?.requiresTwoFactor) {
        sessionStorage.setItem('patientTwoFactorChallenge', JSON.stringify({ ...data.data, returnTo: destination }))
        navigate('/two-factor-login')
      } else if (data.success) {
        resetSessionExpiredNotification()
        setToken(data.token)
        loginNavigationStarted.current = true
        navigate(destination)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated' && token && !loginNavigationStarted.current) {
      navigate(destination)
    }
  }, [authStatus, destination, navigate, token])

  return (
    <AuthShell eyebrow='MEDFLOW AI account' title='Welcome Back' description='Sign in to access your pet care dashboard, medical records, and veterinary appointments.'>
      <form onSubmit={onSubmitHandler} className='space-y-5'>
        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Mail className='h-4 w-4 text-muted' />
            Email
          </label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className='mf-field mt-1.5'
            type='email'
            required
            autoComplete='email'
            placeholder='you@example.com'
          />
        </div>

        <div>
          <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
            <Lock className='h-4 w-4 text-muted' />
            Password
          </label>
          <div className='relative mt-1.5'>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className='mf-field pr-12'
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete='current-password'
              placeholder='Enter your password'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-muted transition-all hover:bg-primary/5 hover:text-ink'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>

        <div className='flex items-center justify-between gap-4'>
          <label className='flex items-center gap-2 text-sm font-medium text-muted'>
            <input type='checkbox' className='h-4 w-4 rounded border-line text-primary focus:ring-primary' />
            Remember me
          </label>
          <button
            type='button'
            onClick={() => navigate('/forgot-password')}
            className='text-sm font-bold text-primary transition-colors hover:text-primary-dark'
          >
            Forgot Password
          </button>
        </div>

        <button disabled={loading} className='mf-button w-full py-4 text-base'>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className='relative my-5 text-center'>
          <div className='absolute inset-0 flex items-center'><div className='w-full border-t border-line'></div></div>
          <span className='relative inline-block bg-white/70 px-4 text-xs font-semibold text-muted'>Or continue with</span>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <button type='button' className='mf-button-secondary flex w-full items-center justify-center gap-2 py-3'>
            <Globe2 className='h-5 w-5' />
            Google Sign In
          </button>
          <button type='button' className='mf-button-secondary flex w-full items-center justify-center gap-2 py-3'>
            <Apple className='h-5 w-5' />
            Apple Sign In
          </button>
        </div>

        <p className='text-center text-sm text-muted'>
          Don&apos;t have an account?{' '}
          <button
            type='button'
            onClick={() => navigate('/register')}
            className='font-bold text-primary transition-colors hover:text-primary-dark'
          >
            Create your account
          </button>
        </p>
      </form>
    </AuthShell>
  )
}

export default Login
