import { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useSearchParams } from '../lib/routerCompat'
import AuthShell from '../components/AuthShell'
import { resetSessionExpiredNotification } from '../api/authClient'
import { safeLoginDestination } from '../lib/authNavigation'

const Login = () => {

  const [state, setState] = useState('Sign Up')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const loginNavigationStarted = useRef(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const destination = safeLoginDestination(searchParams.get('returnTo'))
  const { authStatus, backendUrl, token, setToken } = useContext(AppContext)

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true)

    try {
      if (state === 'Sign Up') {

        const { data } = await axios.post(backendUrl + '/api/user/register', { name, email, password, confirmPassword }, { withCredentials: true })

        if (data.success) {
          toast.success(data.message)
          setState('Login')
        } else {
          toast.error(data.message)
        }

      } else {

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
    <AuthShell eyebrow='MedFlow AI account' title={state === 'Sign Up' ? 'Create your account' : 'Welcome back'} description={`Please ${state === 'Sign Up' ? 'sign up' : 'sign in'} to book appointments and manage your care securely.`}>
    <form onSubmit={onSubmitHandler} className='space-y-4 text-sm text-slate-600'>
        {state === 'Sign Up'
          ? <div className='w-full '>
            <p className='mf-label'>Full name</p>
            <input onChange={(e) => setName(e.target.value)} value={name} className='mf-field' type="text" required />
          </div>
          : null
        }
        <div className='w-full '>
          <p className='mf-label'>Email</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='mf-field' type="email" required />
        </div>
        <div className='w-full '>
          <p className='mf-label'>Password</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='mf-field' type="password" required />
        </div>
        {state === 'Sign Up'
          ? <div className='w-full '>
            <p className='mf-label'>Confirm password</p>
            <input onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} className='mf-field' type="password" required />
          </div>
          : null
        }
        <button disabled={loading} className='mf-button w-full text-base'>{loading ? 'Please wait...' : state === 'Sign Up' ? 'Create account' : 'Sign in'}</button>
        {state === 'Sign Up'
          ? <p>Already have an account? <span onClick={() => setState('Login')} className='font-semibold text-primary underline cursor-pointer'>Login here</span></p>
          : <div className='space-y-2'>
            <p>Create a new account? <span onClick={() => setState('Sign Up')} className='font-semibold text-primary underline cursor-pointer'>Click here</span></p>
            <p><span onClick={() => navigate('/forgot-password')} className='text-primary underline cursor-pointer'>Forgot password?</span></p>
          </div>
        }
    </form>
    </AuthShell>
  )
}

export default Login
