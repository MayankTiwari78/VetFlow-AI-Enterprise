import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext'

const DoctorsList = () => {

  const { doctors, changeAvailability , aToken , getAllDoctors} = useContext(AdminContext)

  useEffect(() => {
    if (aToken) {
        getAllDoctors()
    }
}, [aToken])

  return (
    <main className='portal-page max-h-[calc(100vh-7rem)] overflow-y-auto'>
      <div><p className='portal-eyebrow'>Clinical network</p><h1 className='portal-title'>Doctor availability</h1><p className='mt-2 text-slate-600'>Review clinician profiles and manage whether they appear as available for booking.</p></div>
      <div className='grid w-full grid-cols-auto gap-5'>
        {doctors.map((item, index) => (
          <article className='portal-card overflow-hidden' key={index}>
            <img className='h-52 w-full bg-[#E7F4F5] object-cover object-top' src={item.image} alt={item.name} />
            <div className='p-5'>
              <p className='text-lg font-semibold text-ink'>{item.name}</p>
              <p className='text-sm text-slate-500'>{item.speciality}</p>
              <div className='mt-4 flex items-center justify-between border-t border-line pt-4 text-sm'>
                <span className={`portal-status ${item.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.available ? 'Available' : 'Unavailable'}</span>
                <label className='flex cursor-pointer items-center gap-2 font-semibold text-slate-600'>
                  <input onChange={()=>changeAvailability(item._id)} type="checkbox" checked={item.available} className='h-4 w-4 accent-[#0F6F85]' />
                  Update
                </label>
              </div>
            </div>
          </article>
        ))}
        {doctors.length === 0 && <div className='portal-card col-span-full p-10 text-center text-slate-500'>No clinician profiles are available.</div>}
      </div>
    </main>
  )
}

export default DoctorsList
