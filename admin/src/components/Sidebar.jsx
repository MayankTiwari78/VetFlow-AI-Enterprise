import { useContext } from 'react'
import { assets } from '../assets/assets'
import { NavLink } from '../lib/routerCompat'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'

const Sidebar = () => {

  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)

  return (
    <aside className='sticky top-20 min-h-[calc(100vh-5rem)] border-r border-line bg-white'>
      {aToken && <ul className='mt-4 space-y-1 px-2 text-slate-600'>

        <NavLink to={'/admin-dashboard'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.home_icon} alt='' />
          <p className='hidden md:block'>Dashboard</p>
        </NavLink>
        <NavLink to={'/all-appointments'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.appointment_icon} alt='' />
          <p className='hidden md:block'>Appointments</p>
        </NavLink>
        <NavLink to={'/add-doctor'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.add_icon} alt='' />
          <p className='hidden md:block'>Add Doctor</p>
        </NavLink>
        <NavLink to={'/doctor-list'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Doctors List</p>
        </NavLink>
        <NavLink to={'/patients'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Patients</p>
        </NavLink>
        <NavLink to={'/medical-records'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.list_icon} alt='' />
          <p className='hidden md:block'>Medical Records</p>
        </NavLink>
        <NavLink to={'/memberships'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Memberships</p>
        </NavLink>
        <NavLink to={'/audit-logs'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.list_icon} alt='' />
          <p className='hidden md:block'>Audit Logs</p>
        </NavLink>
        <NavLink to={'/security'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Security</p>
        </NavLink>
      </ul>}

      {dToken && <ul className='mt-4 space-y-1 px-2 text-slate-600'>
        <NavLink to={'/doctor-dashboard'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.home_icon} alt='' />
          <p className='hidden md:block'>Dashboard</p>
        </NavLink>
        <NavLink to={'/doctor-appointments'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.appointment_icon} alt='' />
          <p className='hidden md:block'>Appointments</p>
        </NavLink>
        <NavLink to={'/doctor-profile'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Profile</p>
        </NavLink>
        <NavLink to={'/security'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 md:min-w-64 cursor-pointer ${isActive ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>
          <img className='min-w-5' src={assets.people_icon} alt='' />
          <p className='hidden md:block'>Security</p>
        </NavLink>
      </ul>}
    </aside>
  )
}

export default Sidebar
