import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'
import { normalizeSpeciality } from '../lib/veterinaryDisplay'
const RelatedDoctors = ({ speciality, docId }) => {

    const navigate = useNavigate()
    const { doctors, currencySymbol } = useContext(AppContext)

    const [relDoc, setRelDoc] = useState([])

    useEffect(() => {
        if (doctors.length > 0 && speciality) {
            const normalizedSelected = normalizeSpeciality(speciality)
            const doctorsData = doctors.filter((doc) => normalizeSpeciality(doc.speciality) === normalizedSelected && doc._id !== docId)
            setRelDoc(doctorsData)
        }
    }, [doctors, speciality, docId])

    return (
        <div className='flex flex-col items-center gap-4 my-16 text-[#262626]'>
            <h1 className='text-3xl font-medium'>Related Veterinarians</h1>
            <p className='sm:w-1/3 text-center text-sm'>Simply browse through our extensive list of trusted veterinarians.</p>
            <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
                {relDoc.map((item, index) => (
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
            </div>
        </div>
    )
}

export default RelatedDoctors