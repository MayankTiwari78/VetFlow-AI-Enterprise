import React, { useContext } from 'react'
import { useNavigate } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'
const TopDoctors = () => {

    const navigate = useNavigate()

    const { doctors, doctorsLoading, doctorsError, getDoctosData, currencySymbol } = useContext(AppContext)

    return (
        <section className='mf-section'>
            <div className='flex flex-col items-center gap-2 text-center'>
              <p className='mf-eyebrow'>Veterinarians you can trust</p>
              <h2 className='mf-title'>Meet your pet care team</h2>
              <p className='mf-copy'>Availability, specialty, and booking stay clear from the first look.</p>
            </div>
            <div className='mt-8 w-full grid grid-cols-auto gap-5 px-0'>
                {doctorsLoading && Array.from({ length: 4 }).map((_, index) => <div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' key={index} />)}
                {doctors.slice(0, 10).map((item, index) => (
                    <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }} className='mf-card overflow-hidden cursor-pointer transition duration-200 hover:-translate-y-1 hover:border-teal' key={index}>
                        <img className='h-56 w-full bg-[#E7F4F5] object-cover object-top' src={item.image} alt={item.name} />
                        <div className='p-5'>
                            <div className={`flex items-center gap-2 text-sm ${item.available ? 'text-emerald-700' : "text-slate-500"}`}>
                                <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-emerald-500' : "bg-slate-400"}`}></p><p>{item.available ? 'Available to book' : "Currently unavailable"}</p>
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
            </div>
            {!doctorsLoading && doctorsError && <div className='mt-8 w-full border-y border-line bg-white px-6 py-10 text-center'>
                <p className='text-lg font-semibold text-ink'>The veterinary directory is not connected</p>
                <p className='mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600'>{doctorsError}</p>
                <button type='button' onClick={getDoctosData} className='mf-button mt-5'>Try again</button>
            </div>}
            {!doctorsLoading && !doctorsError && doctors.length === 0 && <div className='mt-8 w-full border-y border-line bg-white px-6 py-10 text-center'>
                <p className='text-lg font-semibold text-ink'>New veterinarian profiles are being prepared</p>
                <p className='mt-2 text-sm text-slate-600'>There are no available veterinarians to display yet. Please check again soon.</p>
            </div>}
            {doctors.length > 0 && <button onClick={() => { navigate('/doctors'); scrollTo(0, 0) }} className='mf-button-secondary mt-8'>Browse all veterinarians</button>}
        </section>

    )
}

export default TopDoctors