import { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from '../lib/routerCompat'
import { motion, AnimatePresence } from 'framer-motion'
import { assets } from '../assets/assets'
import BrandLogo from '../components/BrandLogo'
import { Eye, EyeOff, Mail, Lock, User, PawPrint, Stethoscope, Building2, Check, ArrowRight, Brain, CalendarCheck, FileText, ShieldCheck, Syringe } from 'lucide-react'

const roles = [
  { value: 'Pet Owner', label: 'Pet Owner', icon: PawPrint },
  { value: 'Veterinarian', label: 'Veterinarian', icon: Stethoscope },
  { value: 'Clinic', label: 'Clinic', icon: Building2 },
]

const benefits = [
  { icon: Brain, title: 'AI Reports' },
  { icon: FileText, title: 'Medical Timeline' },
  { icon: Syringe, title: 'Vaccination Tracking' },
  { icon: CalendarCheck, title: 'Appointments' },
  { icon: ShieldCheck, title: 'Emergency Access' },
]

const Register = () => {
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const [step, setStep] = useState('account')
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'Pet Owner'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const updateField = (field, value) => setFormData({ ...formData, [field]: value })

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/user/register', {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: formData.role
      }, { withCredentials: true })
      if (data.success) {
        toast.success(data.message || 'Account created successfully')
        navigate('/login')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setStep('profile')
  }

  const backStep = () => setStep('account')

  return (
    <div className='flex min-h-[calc(100vh-5rem)] flex-col justify-center py-6'>
      <div className='mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_1.05fr]'>
        <aside className='relative isolate hidden overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-soft-xl sm:p-6 lg:flex lg:flex-col'>
          <div className='absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(15,157,138,0.48),rgba(15,23,42,0.96)_45%,rgba(56,217,169,0.24))]' />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-xl'
          >
            <PawPrint className='h-3 w-3 text-accent' />
            Trusted by thousands of pet owners
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='mt-4 max-w-lg text-[40px] font-black leading-[1.08] sm:text-[44px]'
          >
            Start Your Pet's Health Journey
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='mt-3 max-w-lg text-sm leading-7 text-white/70'
          >
            Create a secure MEDFLOW AI account for AI reports, medical timelines, vaccination tracking, appointments, and emergency-ready pet records.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className='relative my-4 overflow-hidden rounded-[24px] border border-white/12 bg-white/10 p-2 backdrop-blur-xl'
          >
            <img src={assets.veterinary_hero} alt='Veterinary care platform illustration' className='h-52 w-full rounded-[18px] object-cover' />
            <div className='absolute bottom-4 left-4 right-4 rounded-[18px] border border-white/15 bg-white/15 p-3 backdrop-blur-2xl'>
              <p className='text-[11px] font-semibold text-white/60'>MEDFLOW AI readiness</p>
              <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-white/15'>
                <div className='h-full w-[86%] rounded-full bg-accent' />
              </div>
            </div>
          </motion.div>

          <div className='grid gap-2 sm:grid-cols-2'>
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.06 }}
                className='flex items-center gap-2.5 rounded-[16px] border border-white/12 bg-white/10 px-3 py-2.5 backdrop-blur-xl'
              >
                <span className='grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/12 text-accent'>
                  <benefit.icon className='h-4 w-4' />
                </span>
                <span className='text-[13px] font-bold'>{benefit.title}</span>
              </motion.div>
            ))}
          </div>

          <div className='mt-4 flex items-center gap-3'>
            <div className='flex -space-x-2.5'>
              {['AR', 'MK', 'SN', 'JT'].map((initial, index) => (
                <span key={initial} className={`grid h-8 w-8 place-items-center rounded-full ${['bg-primary', 'bg-secondary', 'bg-accent', 'bg-white/20'][index]} text-[10px] font-black text-white ring-4 ring-ink/40`}>
                  {initial}
                </span>
              ))}
            </div>
            <p className='text-[13px] font-semibold text-white/70'>Trusted by thousands of pet owners</p>
          </div>
        </aside>

        <main className='flex items-center'>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
            className='glass-card w-full p-5 shadow-soft-xl sm:p-6 lg:p-8'
          >
            <div className='flex justify-center'>
              <BrandLogo compact />
            </div>
            <div className='mt-5 text-center'>
              <p className='mf-eyebrow'>Create Account</p>
              <h2 className='mt-2 text-3xl font-black text-ink'>Create Account</h2>
              <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-muted'>Join the premium AI veterinary healthcare platform.</p>
            </div>

            <div className='my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
              <div className={`flex items-center gap-2 ${step === 'account' ? 'text-primary' : 'text-muted'}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${step === 'account' ? 'bg-primary text-white shadow-soft' : 'bg-white text-muted'}`}>1</span>
                <span className='text-sm font-bold'>Account</span>
              </div>
              <div className='h-px w-12 bg-line' />
              <div className={`flex items-center justify-end gap-2 ${step === 'profile' ? 'text-primary' : 'text-muted'}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${step === 'profile' ? 'bg-primary text-white shadow-soft' : 'bg-white text-muted'}`}>2</span>
                <span className='text-sm font-bold'>Profile</span>
              </div>
            </div>

            <AnimatePresence mode='wait'>
              {step === 'account' && (
                <motion.form
                  key='account'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
                  onSubmit={(e) => { e.preventDefault(); nextStep() }}
                  className='space-y-4'
                >
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                      <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
                        <User className='h-3.5 w-3.5 text-muted' />
                        First Name
                      </label>
                      <input onChange={(e) => updateField('firstName', e.target.value)} value={formData.firstName} className='mf-field mt-1 !py-3' type='text' required placeholder='Jane' />
                    </div>
                    <div>
                      <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
                        <User className='h-3.5 w-3.5 text-muted' />
                        Last Name
                      </label>
                      <input onChange={(e) => updateField('lastName', e.target.value)} value={formData.lastName} className='mf-field mt-1 !py-3' type='text' required placeholder='Doe' />
                    </div>
                  </div>

                  <div>
                    <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
                      <Mail className='h-3.5 w-3.5 text-muted' />
                      Email
                    </label>
                    <input onChange={(e) => updateField('email', e.target.value)} value={formData.email} className='mf-field mt-1 !py-3' type='email' required autoComplete='email' placeholder='you@example.com' />
                  </div>

                  <div>
                    <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
                      <Lock className='h-3.5 w-3.5 text-muted' />
                      Password
                    </label>
                    <div className='relative mt-1'>
                      <input onChange={(e) => updateField('password', e.target.value)} value={formData.password} className='mf-field pr-12 !py-3' type={showPassword ? 'text' : 'password'} required autoComplete='new-password' placeholder='At least 8 characters' />
                      <button type='button' onClick={() => setShowPassword(!showPassword)} className='absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-muted transition-all hover:bg-primary/5 hover:text-ink' aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className='flex items-center gap-2 text-sm font-semibold text-ink'>
                      <Lock className='h-3.5 w-3.5 text-muted' />
                      Confirm Password
                    </label>
                    <div className='relative mt-1'>
                      <input onChange={(e) => updateField('confirmPassword', e.target.value)} value={formData.confirmPassword} className='mf-field pr-12 !py-3' type={showConfirm ? 'text' : 'password'} required autoComplete='new-password' placeholder='Confirm your password' />
                      <button type='button' onClick={() => setShowConfirm(!showConfirm)} className='absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-muted transition-all hover:bg-primary/5 hover:text-ink' aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                        {showConfirm ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                  </div>

                  <button type='submit' className='mf-button w-full !py-3 text-sm'>
                    Continue
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </button>
                </motion.form>
              )}

              {step === 'profile' && (
                <motion.form
                  key='profile'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
                  onSubmit={onSubmitHandler}
                  className='space-y-4'
                >
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-ink'>Role</label>
                    <div className='grid gap-3 sm:grid-cols-3'>
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type='button'
                          onClick={() => updateField('role', role.value)}
                          className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-[18px] border p-4 text-center transition-all duration-200 ${
                            formData.role === role.value
                              ? 'border-primary/40 bg-primary/10 text-primary shadow-soft'
                              : 'border-line/80 bg-white/70 text-muted hover:border-primary/30 hover:bg-primary/5'
                          }`}
                        >
                          <role.icon className='h-5 w-5' />
                          <span className='text-sm font-bold'>{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className='flex items-start gap-3 rounded-[16px] border border-line/70 bg-white/70 p-3 text-sm leading-6 text-muted'>
                    <input type='checkbox' className='mt-1 h-4 w-4 rounded border-line text-primary focus:ring-primary' />
                    <span>I agree to the MEDFLOW AI terms and privacy policy.</span>
                  </label>

                  <div className='flex gap-3'>
                    <button type='button' onClick={backStep} className='mf-button-secondary flex-1 !py-3 text-sm'>
                      Back
                    </button>
                    <button type='submit' disabled={loading} className='mf-button flex-1 !py-3 text-sm'>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <p className='mt-4 text-center text-sm text-muted'>
              Already have account?{' '}
              <button type='button' onClick={() => navigate('/login')} className='font-bold text-primary transition-colors hover:text-primary-dark'>
                Sign In
              </button>
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default Register