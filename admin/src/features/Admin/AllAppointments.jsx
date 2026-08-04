import React, { useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const AllAppointments = () => {

  const { aToken, appointments, cancelAppointment, getAllAppointments } = useContext(AdminContext)
  const { backendUrl, slotDateFormat, calculateAge, currency } = useContext(AppContext)
  const [notes, setNotes] = useState(null)

  const loadClinicalNotes = async (appointment) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/appointments/${appointment._id}/clinical-notes`, { headers: { aToken } })
      setNotes({ appointment, clinicalNotes: data.notes?.clinicalNotes || '', clinicalNotesUpdatedAt: data.notes?.clinicalNotesUpdatedAt })
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to load clinical notes')
    }
  }

  useEffect(() => {
    if (aToken) {
      getAllAppointments()
    }
  }, [aToken])

  return (
    <main className='portal-page'>

      <div><p className='portal-eyebrow'>Care operations</p><h1 className='portal-title'>All appointments</h1><p className='mt-2 text-slate-600'>Monitor booking status and handle appointment exceptions.</p></div>

      <div className='portal-card text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1.4fr] grid-flow-col py-3 px-6 border-b border-line bg-mist font-semibold text-slate-600'>
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1.4fr] items-center text-slate-600 py-3 px-6 border-b border-line hover:bg-mist' key={index}>
            <p className='max-sm:hidden'>{index+1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full bg-mist' alt={item.userData.name} /> <p>{item.userData.name}</p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <div className='flex items-center gap-2'>
              <img src={item.docData.image} className='w-8 rounded-full bg-mist' alt={item.docData.name} /> <p>{item.docData.name}</p>
            </div>
            <p>{currency}{item.amount}</p>
            <div className='flex items-center gap-2'>
              {item.cancelled ? <p className='portal-status bg-red-50 text-red-700'>Cancelled</p> : item.isCompleted ? <p className='portal-status bg-emerald-50 text-emerald-700'>Completed</p> : <img onClick={() => cancelAppointment(item._id)} className='w-9 cursor-pointer' src={assets.cancel_icon} alt="Cancel appointment" />}
              <button type='button' className='portal-button-secondary min-h-8 px-3 py-1' onClick={() => loadClinicalNotes(item)}>Notes</button>
            </div>
          </div>
        ))}
      </div>

      {notes && <section className='portal-card p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div><p className='portal-eyebrow'>Explicit clinical notes access</p><h2 className='mt-1 text-xl font-semibold text-ink'>{notes.appointment.userData?.name || 'Patient'} with {notes.appointment.docData?.name || 'Doctor'}</h2></div>
          <button type='button' className='portal-button-secondary' onClick={() => setNotes(null)}>Close</button>
        </div>
        <p className='mt-4 whitespace-pre-wrap rounded-md border border-line bg-mist p-4 text-sm text-slate-700'>{notes.clinicalNotes || 'No clinical notes recorded.'}</p>
        {notes.clinicalNotesUpdatedAt && <p className='mt-2 text-xs text-slate-500'>Updated {new Date(notes.clinicalNotesUpdatedAt).toLocaleString()}</p>}
      </section>}

    </main>
  )
}

export default AllAppointments
