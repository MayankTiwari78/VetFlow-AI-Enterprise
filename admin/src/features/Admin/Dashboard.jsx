import React, { useContext, useEffect } from 'react'
import { assets } from '../../assets/assets'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'

const Dashboard = () => {

  const { aToken, getDashData, cancelAppointment, dashData } = useContext(AdminContext)
  const { slotDateFormat } = useContext(AppContext)

  useEffect(() => {
    if (aToken) {
      getDashData()
    }
  }, [aToken])

  return dashData && (
    <main className='portal-page'>
      <div><p className='portal-eyebrow'>Operations overview</p><h1 className='portal-title'>Hospital dashboard</h1><p className='mt-2 text-slate-600'>A focused view of clinicians, patient demand, and the latest booking activity.</p></div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        <div className='portal-card flex items-center gap-3 p-5'>
          <img className='w-14' src={assets.doctor_icon} alt="" />
          <div>
            <p className='text-2xl font-semibold text-ink'>{dashData.doctors}</p>
            <p className='text-slate-500'>Clinicians</p>
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
              <img className='rounded-full w-10 bg-mist' src={item.docData.image} alt={item.docData.name} />
              <div className='flex-1 text-sm'>
                <p className='text-ink font-semibold'>{item.docData.name}</p>
                <p className='text-slate-500'>Booking on {slotDateFormat(item.slotDate)}</p>
              </div>
              {item.cancelled ? <p className='portal-status bg-red-50 text-red-700'>Cancelled</p> : item.isCompleted ? <p className='portal-status bg-emerald-50 text-emerald-700'>Completed</p> : <img onClick={() => cancelAppointment(item._id)} className='w-9 cursor-pointer' src={assets.cancel_icon} alt="Cancel appointment" />}
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}

export default Dashboard
