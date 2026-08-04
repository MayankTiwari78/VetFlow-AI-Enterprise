import { useContext } from 'react'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from '../lib/routerCompat'
import { logoutAdminSession } from '../api/authClient'
import { publicEnv } from '../lib/env'
import BrandLogo from './BrandLogo'

const Navbar = () => {

  const { dToken, setDToken } = useContext(DoctorContext)
  const { aToken, setAToken } = useContext(AdminContext)
  const backendUrl = publicEnv.backendUrl

  const navigate = useNavigate()

  const logout = async () => {
    await logoutAdminSession(backendUrl)
    navigate('/')
    dToken && setDToken('')
    dToken && window.localStorage.removeItem('dToken')
    aToken && setAToken('')
    aToken && window.localStorage.removeItem('aToken')
  }

  return (
    <header className='sticky top-0 z-30 flex min-h-20 justify-between items-center px-4 sm:px-8 lg:px-10 border-b border-line bg-white/95 backdrop-blur'>
      <div className='flex items-center gap-3 text-xs'>
        <BrandLogo onClick={() => navigate('/')} compact />
        <p className='portal-status bg-[#E7F4F5] text-primary'>{aToken ? 'Hospital administration' : 'Clinical workspace'}</p>
      </div>
      <button onClick={() => logout()} className='portal-button'>Log out</button>
    </header>
  )
}

export default Navbar
