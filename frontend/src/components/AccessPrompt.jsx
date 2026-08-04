import { Link } from '../lib/routerCompat'

const AccessPrompt = ({ title, description }) => (
  <div className='min-h-[62vh] py-14'>
    <div className='mx-auto max-w-2xl border-y border-line bg-white px-6 py-12 text-center'>
      <span className='mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E7F4F5] font-bold text-primary'>MF</span>
      <p className='mf-eyebrow mt-5'>Protected patient area</p>
      <h1 className='mt-2 text-3xl font-semibold text-ink'>{title}</h1>
      <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600'>{description}</p>
      <Link to='/login' className='mf-button mt-6'>Sign in securely</Link>
    </div>
  </div>
)

export default AccessPrompt
