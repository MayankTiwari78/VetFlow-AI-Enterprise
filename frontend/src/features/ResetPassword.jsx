import axios from 'axios'
import { useContext, useState } from 'react'
import { Link, useNavigate, useSearchParams } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        <div className='w-full'>
          <label className='mf-label' htmlFor='new-password'>New password</label>
          <input id='new-password' onChange={(e) => setPassword(e.target.value)} value={password} className='mf-field' type='password' autoComplete='new-password' required />
        </div>
        <div className='w-full'>
          <label className='mf-label' htmlFor='confirm-new-password'>Confirm password</label>
          <input id='confirm-new-password' onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} className='mf-field' type='password' autoComplete='new-password' required />
        </div>
        <button disabled={loading} className='mf-button w-full'>{loading ? 'Please wait...' : 'Update password'}</button>
        <Link className='block text-center text-sm font-semibold text-primary' to='/login'>Back to sign in</Link>
    </form>
    </AuthShell>
  )
}

export default ResetPassword
