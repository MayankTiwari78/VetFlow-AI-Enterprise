import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate, useParams } from '../lib/routerCompat'

const Doctors = () => {

  const { speciality } = useParams()

  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const navigate = useNavigate();

  const { doctors, doctorsLoading, doctorsError, getDoctosData } = useContext(AppContext)

  const applyFilter = () => {
    if (speciality) {
      setFilterDoc(doctors.filter(doc => doc.speciality === speciality))
    } else {
      setFilterDoc(doctors)
    }
  }

  useEffect(() => {
    applyFilter()
  }, [doctors, speciality])

  return (
    <section className='py-10'>
      <div className='mb-8'><p className='mf-eyebrow'>Find the right care</p><h1 className='mf-title'>Browse clinicians</h1><p className='mf-copy'>Filter by speciality and choose a time that works for you.</p></div>
      <div className='flex flex-col sm:flex-row items-start gap-5'>
        <button onClick={() => setShowFilter(!showFilter)} className={`mf-button-secondary sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}>Filters</button>
        <aside className={`mf-card w-full flex-col gap-2 p-3 text-sm text-slate-600 sm:w-56 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          <p onClick={() => speciality === 'General physician' ? navigate('/doctors') : navigate('/doctors/General physician')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'General physician' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>General physician</p>
          <p onClick={() => speciality === 'Gynecologist' ? navigate('/doctors') : navigate('/doctors/Gynecologist')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'Gynecologist' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>Gynecologist</p>
          <p onClick={() => speciality === 'Dermatologist' ? navigate('/doctors') : navigate('/doctors/Dermatologist')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'Dermatologist' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>Dermatologist</p>
          <p onClick={() => speciality === 'Pediatricians' ? navigate('/doctors') : navigate('/doctors/Pediatricians')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'Pediatricians' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>Pediatricians</p>
          <p onClick={() => speciality === 'Neurologist' ? navigate('/doctors') : navigate('/doctors/Neurologist')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'Neurologist' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>Neurologist</p>
          <p onClick={() => speciality === 'Gastroenterologist' ? navigate('/doctors') : navigate('/doctors/Gastroenterologist')} className={`rounded-md px-3 py-2 cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>Gastroenterologist</p>
        </aside>
        <div className='w-full grid grid-cols-auto gap-5'>
          {doctorsLoading && Array.from({ length: 6 }).map((_, index) => <div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' key={index} />)}
          {filterDoc.map((item, index) => (
            <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }} className='mf-card overflow-hidden cursor-pointer transition duration-200 hover:-translate-y-1 hover:border-teal' key={index}>
              <img className='h-56 w-full bg-[#E7F4F5] object-cover object-top' src={item.image} alt={item.name} />
              <div className='p-5'>
                <div className={`flex items-center gap-2 text-sm ${item.available ? 'text-emerald-700' : "text-slate-500"}`}>
                  <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-emerald-500' : "bg-slate-400"}`}></p><p>{item.available ? 'Available to book' : "Not available"}</p>
                </div>
                <p className='text-[#262626] text-lg font-medium'>{item.name}</p>
                <p className='text-[#5C5C5C] text-sm'>{item.speciality}</p>
              </div>
            </div>
          ))}
          {!doctorsLoading && doctorsError && <div className='col-span-full border-y border-line bg-white p-10 text-center text-slate-600'>
            <p className='text-lg font-semibold text-ink'>The care directory is not connected</p>
            <p className='mx-auto mt-2 max-w-lg text-sm leading-6'>{doctorsError}</p>
            <button type='button' onClick={getDoctosData} className='mf-button mt-5'>Try again</button>
          </div>}
          {!doctorsLoading && !doctorsError && filterDoc.length === 0 && <div className='col-span-full border-y border-line bg-white p-10 text-center text-slate-600'>No clinicians are currently listed for this speciality.</div>}
        </div>
      </div>
    </section>
  )
}

export default Doctors
