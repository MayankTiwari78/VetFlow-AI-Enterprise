import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'

import { isAuthSessionHandledError } from '../api/authClient'
import { AppContext } from '../context/AppContext'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const labelForType = (type) => ({
  consultation_summary: 'Consultation',
  diagnosis_history: 'Diagnosis/history',
  allergy_update: 'Allergy update',
  vaccination_record: 'Vaccination',
  report_metadata: 'Report metadata',
  treatment_plan: 'Treatment plan',
  prescription_plan: 'Prescription'
}[type] || type || 'Record')

const dateForRecord = (record) => record.finalizedAt || record.createdAt || record.updatedAt

const MedicalTimeline = () => {
  const { authStatus, backendUrl, token } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const loadTimeline = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/medical-timeline`, { headers: { token } })
      setTimeline(data.timeline || data.data?.timeline)
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || 'Your medical timeline is temporarily unavailable.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadTimeline() }, [token])

  const items = useMemo(() => {
    const records = (timeline?.records || []).map((record) => ({
      id: record._id,
      kind: record.type,
      date: dateForRecord(record),
      title: record.title,
      body: record.summary,
      status: record.status,
      source: 'record',
      details: record.details
    }))
    const appointments = (timeline?.appointments || []).map((appointment) => ({
      id: appointment._id,
      kind: appointment.status || (appointment.cancelled ? 'cancelled' : appointment.isCompleted ? 'completed' : 'scheduled'),
      date: appointment.date,
      title: appointment.docData?.name || 'Appointment',
      body: `${appointment.slotDate}, ${appointment.slotTime}`,
      status: appointment.status,
      source: 'appointment'
    }))
    return [...records, ...appointments]
      .filter((item) => filter === 'all' || item.kind === filter || item.source === filter)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  }, [filter, timeline])

  if (authStatus === 'initializing' || loading) return <main className='space-y-5 py-10'><div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='h-96 animate-pulse rounded-lg bg-white' /></main>
  if (!token) return <main className='py-10' />
  if (error) return <main className='py-14'><section className='mf-card mx-auto max-w-2xl p-10 text-center'><p className='mf-eyebrow'>Protected health record</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Timeline unavailable</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button type='button' className='mf-button mt-6' onClick={loadTimeline}>Retry</button></section></main>

  return (
    <main className='py-10'>
      <section className='mb-7 flex flex-col justify-between gap-5 border-b border-line pb-7 lg:flex-row lg:items-end'>
        <div><p className='mf-eyebrow'>Protected patient timeline</p><h1 className='mf-title'>Medical timeline</h1><p className='mf-copy'>Finalized patient-visible records, appointment history, allergies, conditions, vaccinations and medication plans.</p></div>
        <select className='mf-field max-w-xs' value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value='all'>All timeline items</option>
          <option value='record'>Medical records</option>
          <option value='appointment'>Appointments</option>
          <option value='vaccination_record'>Vaccinations</option>
          <option value='prescription_plan'>Prescriptions</option>
          <option value='report_metadata'>Reports</option>
        </select>
      </section>

      {timeline?.documentStorage && !timeline.documentStorage.configured && <div className='mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>{timeline.documentStorage.message}</div>}

      <section className='mb-6 grid gap-4 md:grid-cols-3'>
        <article className='mf-card p-5'><p className='mf-eyebrow'>Allergies</p><p className='mt-3 text-sm font-semibold text-ink'>{timeline?.healthProfile?.allergies?.length ? timeline.healthProfile.allergies.join(', ') : 'None recorded'}</p></article>
        <article className='mf-card p-5'><p className='mf-eyebrow'>Chronic conditions</p><p className='mt-3 text-sm font-semibold text-ink'>{timeline?.healthProfile?.chronicConditions?.length ? timeline.healthProfile.chronicConditions.join(', ') : 'None recorded'}</p></article>
        <article className='mf-card p-5'><p className='mf-eyebrow'>Blood group</p><p className='mt-3 text-sm font-semibold text-ink'>{timeline?.healthProfile?.bloodGroup || 'Not known'}</p></article>
      </section>

      <section className='space-y-4'>
        {items.map((item) => (
          <article className='mf-card p-5' key={`${item.source}-${item.id}`}>
            <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-start'>
              <div><p className='mf-eyebrow'>{item.source === 'record' ? labelForType(item.kind) : 'Appointment'}</p><h2 className='mt-1 text-lg font-semibold text-ink'>{item.title}</h2><p className='mt-2 text-sm leading-6 text-slate-600'>{item.body}</p></div>
              <p className='rounded-md bg-[#E7F4F5] px-3 py-1 text-xs font-semibold uppercase text-primary'>{item.status || item.kind}</p>
            </div>
            {item.details?.medicines?.length > 0 && <ul className='mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2'>{item.details.medicines.map((medicine) => <li className='rounded-md border border-line p-3' key={`${item.id}-${medicine.name}`}><span className='font-semibold text-ink'>{medicine.name}</span> - {medicine.dosage}, {medicine.frequency}, {medicine.duration}</li>)}</ul>}
            {item.details?.vaccine && <p className='mt-4 text-sm text-slate-600'>{item.details.vaccine.name} administered on {item.details.vaccine.administeredOn}</p>}
          </article>
        ))}
        {items.length === 0 && <div className='mf-card p-10 text-center text-sm text-slate-500'>No finalized patient-visible timeline items match this filter.</div>}
      </section>
    </main>
  )
}

export default MedicalTimeline
