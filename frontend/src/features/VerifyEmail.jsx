import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { Link, useSearchParams } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'
import { MailCheck } from 'lucide-react'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const { backendUrl } = useContext(AppContext)
  const [status, setStatus] = useState('Verifying email...')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('Verification link is missing or invalid.')
      return
    }

    axios.post(backendUrl + '/api/v1/auth/verify-email', { token }, { withCredentials: true })
      .then(({ data }) => {
        setStatus(data.message)
        toast.success(data.message)
      })
      .catch((error) => {
        const message = error.response?.data?.message || error.message
        setStatus(message)
        toast.error(message)
      })
  }, [backendUrl, searchParams])

  return (
    <AuthShell eyebrow='Identity check' title='Verify your email' description='Email verification protects account recovery and important pet care notifications.'>
      <div className='text-center'>
        <div className='rounded-xl border border-line/60 bg-mist p-6 text-sm text-slate-700'>
          <div className='flex items-center justify-center gap-3 mb-3'>
            <MailCheck className='h-5 w-5 text-primary' />
            <span className='font-semibold text-ink'>{status}</span>
          </div>
        </div>
        <div className='mt-6 flex justify-center gap-4 text-sm'>
          <Link className='mf-button-secondary' to='/login'>Sign in</Link>
          <Link className='mf-button' to='/otp?purpose=EMAIL_VERIFICATION'>Use a code</Link>
        </div>
      </div>
    </AuthShell>
  )
}

export default VerifyEmail
