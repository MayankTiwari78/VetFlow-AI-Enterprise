import axios from 'axios'
import { useContext, useState } from 'react'
import { Link } from '../lib/routerCompat'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import AuthShell from '../components/AuthShell'

const ForgotPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const { data } = await axios.post(backendUrl + '/api/v1/auth/forgot-password', { email }, { withCredentials: true })
      toast.success(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow='Account recovery' title='Reset your password' description='Enter the email linked to your patient account. We will send a time-limited reset link if the account exists.'>
    <form onSubmit={onSubmitHandler} className='space-y-5'>
        <div className='w-full'>
          <label className='mf-label' htmlFor='recovery-email'>Email</label>
          <input id='recovery-email' onChange={(e) => setEmail(e.target.value)} value={email} className='mf-field' type='email' autoComplete='email' required />
        </div>
        <button disabled={loading} className='mf-button w-full'>{loading ? 'Please wait...' : 'Send reset link'}</button>
        <Link className='block text-center text-sm font-semibold text-primary' to='/login'>Back to sign in</Link>
    </form>
    </AuthShell>
  )
}

export default ForgotPassword
