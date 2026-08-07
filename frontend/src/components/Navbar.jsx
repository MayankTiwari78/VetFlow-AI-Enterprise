import { useContext, useState, useEffect } from 'react'
import { NavLink, useNavigate } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'
import { logoutPatientSession } from '../api/authClient'
import BrandLogo from './BrandLogo'
import { Menu, X, ChevronDown, LogOut, User, Heart, Calendar, Shield, PawPrint, FileText, LayoutDashboard } from 'lucide-react'

const Navbar = () => {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const { token, setToken, userData, backendUrl } = useContext(AppContext)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const logout = async () => {
    await logoutPatientSession(backendUrl)
    setToken('')
    navigate('/login')
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/#features', label: 'Features' },
    { to: '/doctors', label: 'Veterinarians' },
    { to: '/#pricing', label: 'Pricing' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass shadow-soft-lg' : 'bg-white/50 backdrop-blur-xl'}`}>
      <div className='mf-page flex min-h-20 items-center justify-between gap-5 px-0'>
        <BrandLogo onClick={() => navigate('/')} />
        
        <ul className='hidden items-center gap-1 lg:flex'>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              <li className='px-4 py-2 text-sm font-medium text-muted hover:text-primary rounded-xl hover:bg-primary/5 transition-all duration-200'>{link.label}</li>
            </NavLink>
          ))}
        </ul>

        <div className='flex items-center gap-2 sm:gap-3'>
          {token && userData ? (
            <div className='relative'>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className='flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary/5 transition-all duration-200'
              >
                <img className='h-9 w-9 rounded-xl border-2 border-primary/20 object-cover shadow-soft' src={userData.image} alt="Account" />
                <span className='hidden sm:block text-sm font-medium text-ink'>{userData.name?.split(' ')[0]}</span>
                <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showDropdown && (
                <>
                  <div className='fixed inset-0 z-10' onClick={() => setShowDropdown(false)} />
                  <div className='absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-line/60 bg-white shadow-soft-xl p-2 animate-fade-in-down'>
                    <div className='px-3 py-3 mb-2 border-b border-line/60'>
                      <p className='text-sm font-semibold text-ink'>{userData.name}</p>
                      <p className='text-xs text-muted'>{userData.email}</p>
                    </div>
                    <div className='space-y-1'>
                      <button onClick={() => { navigate('/my-profile'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <User className='h-4 w-4' /> My profile
                      </button>
                      <button onClick={() => { navigate('/health-profile'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <Heart className='h-4 w-4' /> Health profile
                      </button>
                      <button onClick={() => { navigate('/pet-owner'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <LayoutDashboard className='h-4 w-4' /> Pet owner dashboard
                      </button>
                      <button onClick={() => { navigate('/pet-owner/pets'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <PawPrint className='h-4 w-4' /> My pets
                      </button>
                      <button onClick={() => { navigate('/medical-timeline'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <FileText className='h-4 w-4' /> Medical timeline
                      </button>
                      <button onClick={() => { navigate('/my-appointments'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <Calendar className='h-4 w-4' /> My appointments
                      </button>
                      <button onClick={() => { navigate('/security'); setShowDropdown(false) }} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted hover:text-ink hover:bg-primary/5 rounded-xl transition-all duration-200'>
                        <Shield className='h-4 w-4' /> Security
                      </button>
                      <hr className='my-1 border-line/60' />
                      <button onClick={logout} className='flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200'>
                        <LogOut className='h-4 w-4' /> Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className='mf-button-ghost hidden sm:inline-flex'>Sign In</button>
              <button onClick={() => navigate('/register')} className='mf-button'>Get Started</button>
            </>
          )}
          <button type='button' onClick={() => setShowMenu(true)} className='grid h-10 w-10 place-items-center rounded-xl hover:bg-primary/5 lg:hidden' aria-label='Open navigation'>
            <Menu className='h-5 w-5 text-ink' />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className='flex items-center justify-between px-5 py-6'>
          <BrandLogo compact />
          <button type='button' onClick={() => setShowMenu(false)} className='grid h-10 w-10 place-items-center rounded-xl hover:bg-primary/5' aria-label='Close navigation'>
            <X className='h-5 w-5 text-ink' />
          </button>
        </div>
        <ul className='flex flex-col gap-1 px-5 mt-5'>
          {navLinks.map((link) => (
            <NavLink key={link.to} onClick={() => setShowMenu(false)} to={link.to}>
              <p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>{link.label}</p>
            </NavLink>
          ))}
          <hr className='my-3 border-line/60' />
          {token && (
            <>
              <NavLink onClick={() => setShowMenu(false)} to='/pet-owner'><p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>Pet Owner Dashboard</p></NavLink>
              <NavLink onClick={() => setShowMenu(false)} to='/pet-owner/pets'><p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>My Pets</p></NavLink>
              <NavLink onClick={() => setShowMenu(false)} to='/health-profile'><p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>Health Profile</p></NavLink>
              <NavLink onClick={() => setShowMenu(false)} to='/medical-timeline'><p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>Medical Timeline</p></NavLink>
              <NavLink onClick={() => setShowMenu(false)} to='/my-appointments'><p className='px-4 py-3 text-lg font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all'>My Appointments</p></NavLink>
            </>
          )}
          <div className='mt-4 px-4'>
            {token ? (
              <button onClick={logout} className='mf-button w-full'>Log out</button>
            ) : (
              <div className='grid gap-3'>
                <button onClick={() => { navigate('/register'); setShowMenu(false) }} className='mf-button w-full'>Get Started</button>
                <button onClick={() => { navigate('/login'); setShowMenu(false) }} className='mf-button-secondary w-full'>Sign In</button>
              </div>
            )}
          </div>
        </ul>
      </div>
    </header>
  )
}

export default Navbar
