import React from 'react'
import { useContext } from 'react'
import { useEffect } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'

const DoctorDashboard = () => {

  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment } = useContext(DoctorContext)
  const { slotDateFormat, currency } = useContext(AppContext)


  useEffect(() => {

    if (dToken) {
      getDashData()
    }

  }, [dToken])

  return dashData && (
    <main className='portal-page'>
      <div><p className='portal-eyebrow'>Clinical workspace</p><h1 className='portal-title'>Doctor dashboard</h1><p className='mt-2 text-slate-600'>Your upcoming care activity, patient load, and completed work at a glance.</p></div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        <div className='portal-card flex items-center gap-3 p-5'>
          <img className='w-14' src={assets.earning_icon} alt="" />
          <div>
            <p className='text-2xl font-semibold text-ink'>{currency} {dashData.earnings}</p>
            <p className='text-slate-500'>Earnings</p>
          </div>
        </div>
        <div className='portal-card flex items-center gap-3 p-5'>
          <img className='w-14' src={assets.appointments_icon} alt="" />
          <div>
            <p className='text-2xl font-semibold text-ink'>{dashData.appointments}</p>
            <p className='text-slate-500'>Appointments</p>
          </div>
        </div>
        <div className='portal-card flex items-center gap-3 p-5'>
          <img className='w-14' src={assets.patients_icon} alt="" />
          <div>
            <p className='text-2xl font-semibold text-ink'>{dashData.patients}</p>
            <p className='text-slate-500'>Patients</p></div>
        </div>
      </div>

      <section className='portal-card overflow-hidden'>
        <div className='flex items-center gap-2.5 px-5 py-4 border-b border-line'>
          <img src={assets.list_icon} alt="" />
          <p className='font-semibold'>Latest Bookings</p>
        </div>

        <div className='divide-y divide-line'>
          {dashData.latestAppointments.slice(0, 5).map((item, index) => (
            <div className='flex items-center px-5 py-3.5 gap-3 hover:bg-mist' key={index}>
              <img className='rounded-full w-10 bg-mist' src={item.userData.image} alt={item.userData.name} />
              <div className='flex-1 text-sm'>
                <p className='text-ink font-semibold'>{item.userData.name}</p>
                <p className='text-slate-500'>Booking on {slotDateFormat(item.slotDate)}</p>
              </div>
              {item.cancelled
                ? <p className='portal-status bg-red-50 text-red-700'>Cancelled</p>
                : item.isCompleted
                  ? <p className='portal-status bg-emerald-50 text-emerald-700'>Completed</p>
                  : <div className='flex'>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                    <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="" />
                  </div>
              }
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}

export default DoctorDashboard
