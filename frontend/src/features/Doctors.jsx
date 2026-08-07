import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate, useParams } from '../lib/routerCompat'
import { normalizeSpeciality, vetSpecialities } from '../lib/veterinaryDisplay'

const Doctors = () => {

  const { speciality } = useParams()

  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const navigate = useNavigate();

  const { doctors, doctorsLoading, doctorsError, getDoctosData, currencySymbol } = useContext(AppContext)

  const applyFilter = () => {
    if (speciality) {
      const normalizedSelected = normalizeSpeciality(speciality)
      setFilterDoc(doctors.filter(doc => normalizeSpeciality(doc.speciality) === normalizedSelected))
    } else {
      setFilterDoc(doctors)
    }
  }

  useEffect(() => {
    applyFilter()
  }, [doctors, speciality])

  return (
    <section className='py-10'>
      <div className='mb-8'><p className='mf-eyebrow'>Find the right veterinarian</p><h1 className='mf-title'>Browse veterinarians</h1><p className='mf-copy'>Filter by clinical department and choose a time that works for you and your pet.</p></div>
      <div className='flex flex-col sm:flex-row items-start gap-5'>
        <button onClick={() => setShowFilter(!showFilter)} className={`mf-button-secondary sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}>Filters</button>
        <aside className={`mf-card w-full flex-col gap-2 p-3 text-sm text-slate-600 sm:w-56 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          {vetSpecialities.map((item) => (
            <p key={item} onClick={() => normalizeSpeciality(speciality) === normalizeSpeciality(item) ? navigate('/doctors') : navigate(`/doctors/${item}`)} className={`rounded-md px-3 py-2 cursor-pointer ${normalizeSpeciality(speciality) === normalizeSpeciality(item) ? 'bg-[#E7F4F5] font-semibold text-primary' : 'hover:bg-mist'}`}>{item}</p>
          ))}
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
                <div className='mt-3 flex flex-col gap-1 text-sm text-slate-600'>
                  <p className='font-medium text-ink'>{item.experience || 'Experienced'}</p>
                  <p>{item.clinicName}</p>
                  <p className='font-medium text-ink'>{currencySymbol}{item.fees}</p>
                </div>
                <button className='mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-white transition hover:bg-teal-700'>Book Appointment</button>
              </div>
            </div>
          ))}
          {!doctorsLoading && doctorsError && <div className='col-span-full border-y border-line bg-white p-10 text-center text-slate-600'>
            <p className='text-lg font-semibold text-ink'>The veterinary directory is not connected</p>
            <p className='mx-auto mt-2 max-w-lg text-sm leading-6'>{doctorsError}</p>
            <button type='button' onClick={getDoctosData} className='mf-button mt-5'>Try again</button>
          </div>}
          {!doctorsLoading && !doctorsError && filterDoc.length === 0 && <div className='col-span-full border-y border-line bg-white p-10 text-center text-slate-600'>No veterinarians are currently listed for this department.</div>}
        </div>
      </div>
    </section>
  )
}

export default Doctors