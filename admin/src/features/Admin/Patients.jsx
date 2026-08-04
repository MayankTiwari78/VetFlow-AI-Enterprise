import axios from 'axios'
import React, { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'

const Patients = () => {
  const { aToken } = useContext(AdminContext)
  const { backendUrl, slotDateFormat, currency } = useContext(AppContext)
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const loadPatients = async () => {
    if (!aToken) return
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/patients`, {
        headers: { aToken },
        params: { search, status }
      })
      setPatients(data.patients || [])
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to load patients')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (patient) => {
    setSelectedPatient(patient)
    setAppointments([])
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/patients/${patient._id}/appointments`, { headers: { aToken } })
      setAppointments(data.appointments || [])
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to load patient appointments')
    }
  }

  useEffect(() => {
    loadPatients()
  }, [aToken, status])

  return (
    <main className='portal-page'>
      <div><p className='portal-eyebrow'>Patient operations</p><h1 className='portal-title'>Patient directory</h1><p className='mt-2 text-slate-600'>Search tenant-scoped patient summaries and review appointment history.</p></div>

      <section className='portal-card p-5'>
        <div className='grid gap-3 sm:grid-cols-[1fr_220px_auto]'>
          <input className='portal-field' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search name, email, or phone' />
          <select className='portal-field' value={status} onChange={(event) => setStatus(event.target.value)}>
            {['ALL', 'ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type='button' className='portal-button' onClick={loadPatients}>Search</button>
        </div>
      </section>

      <section className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='portal-card overflow-hidden text-sm'>
          <div className='grid grid-cols-[2fr_1fr_1fr_auto] gap-3 border-b border-line bg-mist px-5 py-3 font-semibold text-slate-600'>
            <p>Patient</p>
            <p>Status</p>
            <p>Visits</p>
            <p>History</p>
          </div>
          {patients.map((patient) => (
            <div className='grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-slate-600 hover:bg-mist' key={patient._id}>
              <div>
                <p className='font-semibold text-ink'>{patient.name}</p>
                <p>{patient.email}</p>
                <p>{patient.phone}</p>
              </div>
              <p className='portal-status bg-[#E7F4F5] text-primary'>{patient.accountStatus}</p>
              <p>{patient.appointmentCount}</p>
              <button type='button' className='portal-button-secondary' onClick={() => loadHistory(patient)}>View</button>
            </div>
          ))}
          {!loading && patients.length === 0 && <p className='p-8 text-center text-slate-500'>No patients match the current filters.</p>}
          {loading && <p className='p-8 text-center text-slate-500'>Loading patients...</p>}
        </div>

        <div className='portal-card p-5'>
          <p className='portal-eyebrow'>Appointment history</p>
          <h2 className='mt-1 text-xl font-semibold text-ink'>{selectedPatient?.name || 'Select a patient'}</h2>
          <div className='mt-4 space-y-3'>
            {appointments.map((appointment) => (
              <article className='rounded-md border border-line p-4 text-sm text-slate-600' key={appointment._id}>
                <p className='font-semibold text-ink'>{appointment.docData?.name || 'Doctor'} - {appointment.status || (appointment.cancelled ? 'cancelled' : appointment.isCompleted ? 'completed' : 'scheduled')}</p>
                <p>{slotDateFormat(appointment.slotDate)}, {appointment.slotTime}</p>
                <p>{currency}{appointment.amount}</p>
              </article>
            ))}
            {selectedPatient && appointments.length === 0 && <p className='text-sm text-slate-500'>No appointment history for this patient.</p>}
            {!selectedPatient && <p className='text-sm text-slate-500'>Choose a patient to view safe appointment history.</p>}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Patients
