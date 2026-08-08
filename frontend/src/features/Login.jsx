import { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useSearchParams } from '../lib/routerCompat'
import { resetSessionExpiredNotification } from '../api/authClient'
import { safeLoginDestination } from '../lib/authNavigation'
import { Eye, EyeOff, Globe2, Apple, Activity, ShieldCheck, Quote } from 'lucide-react'
import { assets } from '../assets/assets'

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
    <div className='fixed inset-0 z-50 flex bg-white'>
      {/* Left Panel — Form */}
      <div className='flex w-full flex-col justify-center px-6 py-8 lg:w-[48%] lg:px-10 xl:px-14 2xl:px-20'>
        <div className='mx-auto w-full max-w-[400px]'>
          {/* Logo */}
          <div className='flex items-center gap-2.5'>
            <span className='relative grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-bg text-white shadow-soft-lg'>
              <Activity className='h-5 w-5' strokeWidth={2.5} />
              <span className='absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent' />
            </span>
            <span className='text-left leading-none'>
              <span className='block text-lg font-extrabold text-ink'>MEDFLOW <span className='gradient-text'>AI</span></span>
            </span>
          </div>

          {/* Heading */}
          <h1 className='mt-7 text-[28px] font-black leading-tight text-ink'>Welcome back</h1>
          <p className='mt-1.5 text-sm leading-6 text-muted'>Sign in to access your pet care dashboard and medical records.</p>

          {/* Form */}
          <form onSubmit={onSubmitHandler} className='mt-7 space-y-4'>
            <div>
              <label className='text-[13px] font-semibold text-ink'>Email</label>
              <input
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                className='mf-field mt-1.5 !py-3'
                type='email'
                required
                autoComplete='email'
                placeholder='you@example.com'
              />
            </div>

            <div>
              <div className='flex items-center justify-between'>
                <label className='text-[13px] font-semibold text-ink'>Password</label>
                <button
                  type='button'
                  onClick={() => navigate('/forgot-password')}
                  className='text-[13px] font-bold text-primary transition-colors hover:text-primary-dark'
                >
                  Forgot Password
                </button>
              </div>
              <div className='relative mt-1.5'>
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  className='mf-field pr-12 !py-3'
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

            <label className='flex items-center gap-2 text-[13px] font-medium text-muted'>
              <input type='checkbox' className='h-4 w-4 rounded border-line text-primary focus:ring-primary' />
              Keep me signed in
            </label>

            <button disabled={loading} className='mf-button w-full !py-3 text-sm'>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className='relative py-1 text-center'>
              <div className='absolute inset-0 flex items-center'><div className='w-full border-t border-line'></div></div>
              <span className='relative inline-block bg-white px-3 text-xs font-semibold text-muted'>Or continue with</span>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <button type='button' className='mf-button-secondary flex w-full items-center justify-center gap-2 !py-2.5 text-sm'>
                <Globe2 className='h-5 w-5' />
                Google
              </button>
              <button type='button' className='mf-button-secondary flex w-full items-center justify-center gap-2 !py-2.5 text-sm'>
                <Apple className='h-5 w-5' />
                Apple
              </button>
            </div>

            <p className='pt-1 text-center text-[13px] text-muted'>
              Don't have an account?{' '}
              <button
                type='button'
                onClick={() => navigate('/register')}
                className='font-bold text-primary transition-colors hover:text-primary-dark'
              >
                Create your account
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* Right Panel — Image */}
      <div className='relative hidden w-[52%] overflow-hidden lg:block'>
        {/* Image */}
        <img
          src={assets.login_woman}
          alt='Professional woman smiling'
          className='absolute inset-0 h-full w-full object-cover object-top'
        />
        {/* Teal overlay gradient */}
        <div className='absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-teal-900/30' />
        <div className='absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent' />

        {/* Top-right badge */}
        <div className='absolute right-6 top-6'>
          <span className='inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl'>
            <ShieldCheck className='h-3.5 w-3.5 text-accent' />
            Secure veterinary intelligence
          </span>
        </div>

        {/* Testimonial card */}
        <div className='absolute bottom-8 left-8 right-8'>
          <div className='rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-2xl'>
            <div className='flex items-start gap-3'>
              <Quote className='h-5 w-5 shrink-0 text-accent/80' />
              <div>
                <p className='text-[13px] leading-6 text-white/90'>
                  MEDFLOW AI has transformed how we manage our clinic records. The AI summaries save hours every day.
                </p>
                <div className='mt-2.5 flex items-center gap-2.5'>
                  <div className='grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[10px] font-bold text-white'>
                    DR
                  </div>
                  <div>
                    <p className='text-[13px] font-semibold text-white'>Dr. Rebecca Torres</p>
                    <p className='text-[11px] text-white/60'>Veterinary Surgeon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login