import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { isAuthSessionHandledError } from '../../api/authClient'

const types = [
  ['', 'All types'],
  ['consultation_summary', 'Consultation'],
  ['diagnosis_history', 'Diagnosis/history'],
  ['allergy_update', 'Allergy update'],
  ['vaccination_record', 'Vaccination'],
  ['report_metadata', 'Report metadata'],
  ['treatment_plan', 'Treatment plan'],
  ['prescription_plan', 'Prescription']
]

const MedicalRecords = () => {
  const { aToken } = useContext(AdminContext)
  const { backendUrl } = useContext(AppContext)
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({ type: '', status: '', patientId: '', dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(false)

  const loadRecords = async () => {
    if (!aToken) return
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      const { data } = await axios.get(`${backendUrl}/api/admin/medical-records`, {
        headers: { aToken },
        params
      })
      setRecords(data.records || data.data?.records || [])
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || 'Unable to load medical records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadRecords() }, [aToken])

  return (
    <main className='portal-page'>
      <div><p className='portal-eyebrow'>Clinical operations</p><h1 className='portal-title'>Medical records</h1><p className='mt-2 text-slate-600'>Tenant-scoped overview of structured records. Private doctor notes remain on appointments and are not shown here.</p></div>
      <section className='portal-card p-5'>
        <div className='grid gap-3 md:grid-cols-5'>
          <select className='portal-field' value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>{types.map(([value, label]) => <option value={value} key={value || 'all'}>{label}</option>)}</select>
          <select className='portal-field' value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value=''>All statuses</option><option value='draft'>Draft</option><option value='finalized'>Finalized</option></select>
          <input className='portal-field' value={filters.patientId} onChange={(event) => setFilters({ ...filters, patientId: event.target.value })} placeholder='Patient ObjectId' />
          <input className='portal-field' type='date' value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          <button className='portal-button' type='button' onClick={loadRecords}>Filter</button>
        </div>
      </section>
      <section className='portal-card overflow-hidden text-sm'>
        <div className='grid gap-3 border-b border-line bg-mist px-5 py-3 font-semibold text-slate-600 md:grid-cols-[1.3fr_1fr_1fr_1fr]'>
          <p>Record</p><p>Patient</p><p>Author</p><p>Status</p>
        </div>
        {records.map((record) => <article className='grid gap-3 border-b border-line px-5 py-4 text-slate-600 hover:bg-mist md:grid-cols-[1.3fr_1fr_1fr_1fr]' key={record._id}>
          <div><p className='font-semibold text-ink'>{record.title}</p><p>{record.type}</p><p className='mt-1'>{record.summary}</p></div>
          <p>{record.patientId}</p>
          <p>{record.author?.displayName || record.author?.accountType}</p>
          <p><span className='portal-status bg-[#E7F4F5] text-primary'>{record.status}</span>{record.patientVisible && <span className='ml-2 portal-status bg-emerald-50 text-emerald-700'>Patient visible</span>}</p>
        </article>)}
        {!loading && records.length === 0 && <p className='p-8 text-center text-slate-500'>No medical records match the current filters.</p>}
        {loading && <p className='p-8 text-center text-slate-500'>Loading medical records...</p>}
      </section>
    </main>
  )
}

export default MedicalRecords
