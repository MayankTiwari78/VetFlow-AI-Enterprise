import { useContext, useState } from 'react'
import { NavLink, useNavigate } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'
import { logoutPatientSession } from '../api/authClient'
import BrandLogo from './BrandLogo'

const Navbar = () => {

  const navigate = useNavigate()

  const [showMenu, setShowMenu] = useState(false)
  const { token, setToken, userData, backendUrl } = useContext(AppContext)

  const logout = async () => {
    await logoutPatientSession(backendUrl)
    setToken('')
    navigate('/login')
  }

  return (
    <header className='sticky top-0 z-30 -mx-5 border-b border-line bg-[#F6FAFB]/95 px-5 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10'>
    <div className='mf-page flex min-h-20 items-center justify-between gap-5 px-0 text-sm'>
      <BrandLogo onClick={() => navigate('/')} />
      <ul className='hidden items-center gap-6 font-semibold text-slate-600 md:flex'>
        <NavLink to='/' >
          <li className='py-2 hover:text-primary'>HOME</li>
          <hr className='border-none outline-none h-0.5 bg-teal w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/doctors' >
          <li className='py-2 hover:text-primary'>ALL DOCTORS</li>
          <hr className='border-none outline-none h-0.5 bg-teal w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/about' >
          <li className='py-2 hover:text-primary'>ABOUT</li>
          <hr className='border-none outline-none h-0.5 bg-teal w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/contact' >
          <li className='py-2 hover:text-primary'>CONTACT</li>
          <hr className='border-none outline-none h-0.5 bg-teal w-3/5 m-auto hidden' />
        </NavLink>
      </ul>

      <div className='flex items-center gap-4 '>
        {
          token && userData
            ? <div className='flex items-center gap-2 cursor-pointer group relative'>
              <img className='h-9 w-9 rounded-full border border-line object-cover' src={userData.image} alt="Account profile" />
              <span className='text-xs text-slate-500' aria-hidden='true'>v</span>
              <div className='absolute top-0 right-0 z-20 hidden pt-14 text-sm font-medium text-slate-600 group-hover:block'>
                <div className='mf-card min-w-52 flex flex-col gap-1 p-2'>
                  <p onClick={() => navigate('/my-profile')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>My profile</p>
                  <p onClick={() => navigate('/health-profile')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>Health profile</p>
                  <p onClick={() => navigate('/medical-timeline')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>Medical timeline</p>
                  <p onClick={() => navigate('/family-health')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>Family health</p>
                  <p onClick={() => navigate('/health-card')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>Health card</p>
                  <p onClick={() => navigate('/my-appointments')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>My appointments</p>
                  <p onClick={() => navigate('/security')} className='cursor-pointer rounded px-3 py-2 hover:bg-mist hover:text-primary'>Security</p>
                  <p onClick={logout} className='cursor-pointer rounded px-3 py-2 text-red-700 hover:bg-red-50'>Log out</p>
                </div>
              </div>
            </div>
            : <button onClick={() => navigate('/login')} className='mf-button hidden md:inline-flex'>Create account</button>
        }
        <button type='button' onClick={() => setShowMenu(true)} className='grid h-10 w-10 place-items-center md:hidden' aria-label='Open navigation'><span className='text-2xl' aria-hidden='true'>&#8801;</span></button>

        {/* ---- Mobile Menu ---- */}
        <div className={`md:hidden ${showMenu ? 'fixed w-full' : 'h-0 w-0'} right-0 top-0 bottom-0 z-40 overflow-hidden bg-white transition-all`}>
          <div className='flex items-center justify-between px-5 py-6'>
            <BrandLogo compact />
            <button type='button' onClick={() => setShowMenu(false)} className='grid h-10 w-10 place-items-center text-2xl' aria-label='Close navigation'>&times;</button>
          </div>
          <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-semibold'>
            <NavLink onClick={() => setShowMenu(false)} to='/'><p className='px-4 py-2 inline-block'>HOME</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/doctors' ><p className='px-4 py-2 inline-block'>ALL DOCTORS</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/about' ><p className='px-4 py-2 inline-block'>ABOUT</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/contact' ><p className='px-4 py-2 inline-block'>CONTACT</p></NavLink>
            {token && <NavLink onClick={() => setShowMenu(false)} to='/health-profile'><p className='px-4 py-2 inline-block'>HEALTH PROFILE</p></NavLink>}
            {token && <NavLink onClick={() => setShowMenu(false)} to='/medical-timeline'><p className='px-4 py-2 inline-block'>MEDICAL TIMELINE</p></NavLink>}
            {token && <NavLink onClick={() => setShowMenu(false)} to='/family-health'><p className='px-4 py-2 inline-block'>FAMILY HEALTH</p></NavLink>}
            {token && <NavLink onClick={() => setShowMenu(false)} to='/health-card'><p className='px-4 py-2 inline-block'>HEALTH CARD</p></NavLink>}
          </ul>
        </div>
      </div>
    </div>
    </header>
  )
}

export default Navbar
