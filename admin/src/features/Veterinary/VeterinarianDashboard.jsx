import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { DoctorContext } from '../../context/DoctorContext'
import { isAuthSessionHandledError } from '../../api/authClient'
import { useNavigate, useParams } from '../../lib/routerCompat'

const getId = (item) => String(item?._id || item?.id || '')
const asArray = (items) => Array.isArray(items) ? items : []
const parseList = (value) => [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))]
const listText = (items) => asArray(items).join(', ')
const dateValue = (value) => value ? String(value).slice(0, 10) : ''
const formatDate = (value) => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
})

const unwrap = (responseData, key, fallback) => responseData?.data?.[key] ?? responseData?.[key] ?? fallback

const emptyRecord = {
  petId: '',
  diagnosis: '',
  symptoms: '',
  treatment: '',
  medications: '',
  laboratoryReports: '',
  attachments: '',
  visitDate: dateValue(new Date().toISOString()),
  followUpDate: ''
}

const emptyVaccination = {
  petId: '',
  vaccineName: '',
  dueDate: '',
  completedDate: '',
  nextDose: '',
  notes: ''
}

const emptyAiReport = {
  petId: '',
  symptoms: '',
  uploadedImages: '',
  aiSummary: '',
  possibleConditions: '',
  severity: 'low',
  recommendations: ''
}

const titles = {
  dashboard: ['Veterinary workspace', 'Veterinarian dashboard', 'Assigned pets, pet medical records, vaccinations, and AI preliminary assessment reports.'],
  pets: ['Assigned pets', 'Assigned pets', 'Review pets connected to your veterinary medical records or vaccinations.'],
  search: ['Search pets', 'Search pets', 'Search by pet name, species, breed, and clinical filters.'],
  'pet-details': ['Pet profile', 'Pet details', 'Review pet profile, medical history, vaccinations, and AI preliminary assessment reports.'],
  records: ['Pet medical records', 'Medical records', 'Create, edit, and review pet medical history.'],
  'create-record': ['Pet medical record', 'Create pet medical record', 'Record diagnosis notes, symptoms, treatment, medication, labs, attachments, and follow-up.'],
  'edit-record': ['Pet medical record', 'Edit pet medical record', 'Update diagnosis notes, symptoms, treatment, medication, labs, attachments, and follow-up.'],
  vaccinations: ['Vaccination management', 'Vaccination management', 'Add, update, delete, and review vaccination history.'],
  ai: ['AI reports', 'AI preliminary assessment reports', 'Review summaries, conditions, severity, recommendations, and uploaded images.']
}

const Skeleton = () => (
  <main className='portal-page'>
    <div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' />
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      <div className='h-36 animate-pulse rounded-lg bg-white' />
      <div className='h-36 animate-pulse rounded-lg bg-white' />
      <div className='h-36 animate-pulse rounded-lg bg-white' />
      <div className='h-36 animate-pulse rounded-lg bg-white' />
    </div>
    <div className='h-96 animate-pulse rounded-lg bg-white' />
  </main>
)

const Field = ({ label, children }) => <label className='portal-label'>{label}{children}</label>

const Modal = ({ title, children, onClose }) => (
  <div className='fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 py-6'>
    <div className='portal-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6'>
      <div className='mb-5 flex items-start justify-between gap-4'>
        <h2 className='text-xl font-semibold text-ink'>{title}</h2>
        <button type='button' className='grid h-9 w-9 place-items-center rounded-md border border-line text-xl text-slate-600' onClick={onClose} aria-label='Close modal'>&times;</button>
      </div>
      {children}
    </div>
  </div>
)

const EmptyState = ({ title, body, actionLabel, onAction }) => (
  <div className='portal-card p-8 text-center'>
    <p className='font-semibold text-ink'>{title}</p>
    <p className='mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600'>{body}</p>
    {actionLabel && <button className='portal-button mt-5' type='button' onClick={onAction}>{actionLabel}</button>}
  </div>
)

const StatCard = ({ label, value, detail }) => (
  <article className='portal-card p-5'>
    <p className='text-sm font-semibold text-slate-500'>{label}</p>
    <p className='mt-2 text-3xl font-semibold text-ink'>{value}</p>
    <p className='mt-2 text-sm text-slate-600'>{detail}</p>
  </article>
)

const DataTable = ({ columns, rows, emptyTitle, renderActions }) => (
  <div className='portal-card overflow-hidden'>
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[780px] text-left text-sm'>
        <thead className='bg-[#E7F4F5] text-xs uppercase text-slate-600'>
          <tr>{columns.map((column) => <th key={column.key} className='px-4 py-3 font-semibold'>{column.label}</th>)}{renderActions && <th className='px-4 py-3 font-semibold'>Actions</th>}</tr>
        </thead>
        <tbody className='divide-y divide-line bg-white'>
          {rows.map((row) => (
            <tr key={getId(row)} className='hover:bg-mist'>
              {columns.map((column) => <td key={column.key} className='px-4 py-3 text-slate-700'>{column.render ? column.render(row) : row[column.key] || 'Not recorded'}</td>)}
              {renderActions && <td className='px-4 py-3'>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {rows.length === 0 && <div className='p-8 text-center text-sm text-slate-600'>{emptyTitle}</div>}
  </div>
)

const PetCard = ({ pet, onOpen }) => (
  <article className='portal-card overflow-hidden'>
    <div className='flex gap-4 p-5'>
      <div className='h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#E7F4F5]'>
        {pet.profileImage ? <img className='h-full w-full object-cover' src={pet.profileImage} alt={pet.name} /> : <div className='grid h-full place-items-center text-2xl font-semibold text-primary'>{String(pet.name || 'P').slice(0, 1)}</div>}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-lg font-semibold text-ink'>{pet.name}</p>
        <p className='mt-1 text-sm text-slate-600'>{pet.species || 'Species not set'} {pet.breed ? `- ${pet.breed}` : ''}</p>
        <p className='mt-2 text-xs font-semibold uppercase text-teal'>{pet.vaccinationStatus || 'unknown'}</p>
      </div>
    </div>
    <div className='border-t border-line px-5 py-3'>
      <button className='text-sm font-semibold text-primary' onClick={() => onOpen(getId(pet))}>Open pet details</button>
    </div>
  </article>
)

const Filters = ({ filters, setFilters, onSearch }) => (
  <form className='portal-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6' onSubmit={onSearch}>
    <input className='portal-field xl:col-span-2' placeholder='Search by name, breed, species' value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
    <input className='portal-field' placeholder='Species' value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value })} />
    <input className='portal-field' placeholder='Breed' value={filters.breed} onChange={(event) => setFilters({ ...filters, breed: event.target.value })} />
    <select className='portal-field' value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })}><option value=''>Gender</option><option>Female</option><option>Male</option><option>Spayed Female</option><option>Neutered Male</option></select>
    <button className='portal-button' type='submit'>Search pets</button>
    <input className='portal-field' min='0' type='number' placeholder='Min age' value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: event.target.value })} />
    <input className='portal-field' min='0' type='number' placeholder='Max age' value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: event.target.value })} />
    <input className='portal-field' min='0' type='number' placeholder='Min weight' value={filters.minWeight} onChange={(event) => setFilters({ ...filters, minWeight: event.target.value })} />
    <input className='portal-field' min='0' type='number' placeholder='Max weight' value={filters.maxWeight} onChange={(event) => setFilters({ ...filters, maxWeight: event.target.value })} />
    <select className='portal-field xl:col-span-2' value={filters.vaccinationStatus} onChange={(event) => setFilters({ ...filters, vaccinationStatus: event.target.value })}><option value=''>Vaccination status</option><option value='up-to-date'>Up to date</option><option value='due'>Due</option><option value='overdue'>Overdue</option><option value='partial'>Partial</option><option value='unknown'>Unknown</option></select>
  </form>
)

const medicationObjects = (value) => parseList(value).map((name) => ({ name, dosage: 'As directed', frequency: 'As directed', duration: 'As directed' }))
const labObjects = (value) => parseList(value).map((title) => ({ title }))
const attachmentObjects = (value) => parseList(value).map((fileUrl, index) => ({ fileName: `Attachment ${index + 1}`, fileUrl }))

const buildRecordPayload = (draft) => ({
  petId: draft.petId,
  diagnosis: draft.diagnosis,
  symptoms: parseList(draft.symptoms),
  medications: medicationObjects(draft.medications),
  prescriptions: [],
  treatment: draft.treatment,
  laboratoryReports: labObjects(draft.laboratoryReports),
  attachments: attachmentObjects(draft.attachments),
  visitDate: draft.visitDate || new Date().toISOString(),
  ...(draft.followUpDate ? { followUpDate: draft.followUpDate } : {})
})

const recordToDraft = (record) => ({
  petId: getId(record?.petId) || String(record?.petId || ''),
  diagnosis: record?.diagnosis || '',
  symptoms: listText(record?.symptoms),
  treatment: record?.treatment || '',
  medications: asArray(record?.medications).map((item) => item.name || item.medicationName || '').filter(Boolean).join(', '),
  laboratoryReports: asArray(record?.laboratoryReports).map((item) => item.title || item.reportType || '').filter(Boolean).join(', '),
  attachments: asArray(record?.attachments).map((item) => item.fileUrl || '').filter(Boolean).join(', '),
  visitDate: dateValue(record?.visitDate || new Date().toISOString()),
  followUpDate: dateValue(record?.followUpDate)
})

const buildVaccinationPayload = (draft) => ({
  petId: draft.petId,
  vaccineName: draft.vaccineName,
  dueDate: draft.dueDate,
  ...(draft.completedDate ? { completedDate: draft.completedDate } : {}),
  ...(draft.nextDose ? { nextDose: draft.nextDose } : {}),
  notes: draft.notes
})

const vaccinationToDraft = (item) => ({
  petId: String(item?.petId || ''),
  vaccineName: item?.vaccineName || '',
  dueDate: dateValue(item?.dueDate),
  completedDate: dateValue(item?.completedDate),
  nextDose: dateValue(item?.nextDose),
  notes: item?.notes || ''
})

const buildAiPayload = (draft) => ({
  petId: draft.petId,
  symptoms: parseList(draft.symptoms),
  uploadedImages: parseList(draft.uploadedImages),
  aiSummary: draft.aiSummary,
  possibleConditions: parseList(draft.possibleConditions),
  severity: draft.severity,
  recommendations: parseList(draft.recommendations),
  generatedAt: new Date().toISOString()
})

const RecordForm = ({ draft, setDraft, pets, onSubmit, saving, submitLabel, error, onCancel, lockPet }) => (
  <form className='space-y-5' onSubmit={onSubmit}>
    {error && <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
    <section className='grid gap-4 sm:grid-cols-2'>
      <Field label='Pet'><select className='portal-field mt-1' required disabled={lockPet} value={draft.petId} onChange={(event) => setDraft({ ...draft, petId: event.target.value })}><option value=''>Select pet</option>{pets.map((pet) => <option key={getId(pet)} value={getId(pet)}>{pet.name} - {pet.species}</option>)}</select></Field>
      <Field label='Visit date'><input className='portal-field mt-1' type='date' required value={draft.visitDate} onChange={(event) => setDraft({ ...draft, visitDate: event.target.value })} /></Field>
      <label className='portal-label sm:col-span-2'>Diagnosis notes<textarea className='portal-field mt-1 min-h-28 resize-y' required value={draft.diagnosis} onChange={(event) => setDraft({ ...draft, diagnosis: event.target.value })} /></label>
      <Field label='Symptoms'><input className='portal-field mt-1' value={draft.symptoms} onChange={(event) => setDraft({ ...draft, symptoms: event.target.value })} placeholder='Separate with commas' /></Field>
      <Field label='Medications'><input className='portal-field mt-1' value={draft.medications} onChange={(event) => setDraft({ ...draft, medications: event.target.value })} placeholder='Separate medication names with commas' /></Field>
      <label className='portal-label sm:col-span-2'>Treatment<textarea className='portal-field mt-1 min-h-28 resize-y' required value={draft.treatment} onChange={(event) => setDraft({ ...draft, treatment: event.target.value })} /></label>
      <Field label='Laboratory reports'><input className='portal-field mt-1' value={draft.laboratoryReports} onChange={(event) => setDraft({ ...draft, laboratoryReports: event.target.value })} placeholder='Report titles, comma separated' /></Field>
      <Field label='Attachments'><input className='portal-field mt-1' value={draft.attachments} onChange={(event) => setDraft({ ...draft, attachments: event.target.value })} placeholder='Attachment URLs, comma separated' /></Field>
      <Field label='Follow-up date'><input className='portal-field mt-1' type='date' value={draft.followUpDate} onChange={(event) => setDraft({ ...draft, followUpDate: event.target.value })} /></Field>
    </section>
    <div className='flex flex-wrap gap-3'><button className='portal-button' disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>{onCancel && <button type='button' className='portal-button-secondary' onClick={onCancel}>Cancel</button>}</div>
  </form>
)

const VaccinationForm = ({ draft, setDraft, pets, onSubmit, saving, submitLabel, error }) => (
  <form className='space-y-5' onSubmit={onSubmit}>
    {error && <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
    <section className='grid gap-4 sm:grid-cols-2'>
      <Field label='Pet'><select className='portal-field mt-1' required value={draft.petId} onChange={(event) => setDraft({ ...draft, petId: event.target.value })}><option value=''>Select pet</option>{pets.map((pet) => <option key={getId(pet)} value={getId(pet)}>{pet.name} - {pet.species}</option>)}</select></Field>
      <Field label='Vaccine name'><input className='portal-field mt-1' required value={draft.vaccineName} onChange={(event) => setDraft({ ...draft, vaccineName: event.target.value })} /></Field>
      <Field label='Due date'><input className='portal-field mt-1' required type='date' value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></Field>
      <Field label='Completed date'><input className='portal-field mt-1' type='date' value={draft.completedDate} onChange={(event) => setDraft({ ...draft, completedDate: event.target.value })} /></Field>
      <Field label='Next dose'><input className='portal-field mt-1' type='date' value={draft.nextDose} onChange={(event) => setDraft({ ...draft, nextDose: event.target.value })} /></Field>
      <label className='portal-label sm:col-span-2'>Notes<textarea className='portal-field mt-1 min-h-24 resize-y' value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
    </section>
    <button className='portal-button' disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>
  </form>
)

const AiReportCard = ({ report }) => (
  <article className='portal-card p-5'>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <p className='font-semibold text-ink'>Severity: <span className='capitalize text-primary'>{report.severity || 'unknown'}</span></p>
      <p className='text-sm text-slate-500'>{formatDate(report.generatedAt || report.createdAt)}</p>
    </div>
    <p className='mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800'>This AI Report is a Preliminary Assessment and must not be considered a diagnosis.</p>
    <div className='mt-4 grid gap-4 text-sm md:grid-cols-2'>
      <div><p className='font-semibold text-slate-700'>Symptoms</p><p className='mt-1 text-slate-600'>{listText(report.symptoms) || 'Not recorded'}</p></div>
      <div><p className='font-semibold text-slate-700'>Possible conditions</p><p className='mt-1 text-slate-600'>{listText(report.possibleConditions) || 'Not recorded'}</p></div>
      <div className='md:col-span-2'><p className='font-semibold text-slate-700'>AI summary</p><p className='mt-1 leading-6 text-slate-600'>{report.aiSummary || 'No summary available'}</p></div>
      <div className='md:col-span-2'><p className='font-semibold text-slate-700'>Recommendations</p><p className='mt-1 text-slate-600'>{listText(report.recommendations) || 'Not recorded'}</p></div>
      <div className='md:col-span-2'><p className='font-semibold text-slate-700'>Uploaded images</p><div className='mt-2 flex flex-wrap gap-2'>{asArray(report.uploadedImages).length ? asArray(report.uploadedImages).map((src) => <a key={src} className='rounded-md border border-line px-3 py-2 text-xs font-semibold text-primary' href={src} target='_blank' rel='noreferrer'>View image</a>) : <span className='text-slate-600'>No images uploaded</span>}</div></div>
    </div>
  </article>
)

const VeterinarianDashboard = ({ view = 'dashboard' }) => {
  const navigate = useNavigate()
  const params = useParams()
  const { backendUrl } = useContext(AppContext)
  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)
  const token = dToken || aToken

  const [pets, setPets] = useState([])
  const [selectedPet, setSelectedPet] = useState(null)
  const [records, setRecords] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', species: '', breed: '', gender: '', minAge: '', maxAge: '', minWeight: '', maxWeight: '', vaccinationStatus: '' })
  const [recordDraft, setRecordDraft] = useState(emptyRecord)
  const [vaccinationDraft, setVaccinationDraft] = useState(emptyVaccination)
  const [aiDraft, setAiDraft] = useState(emptyAiReport)
  const [activeVaccination, setActiveVaccination] = useState(null)
  const [modal, setModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const selectedPetId = params.petId || ''
  const title = titles[view] || titles.dashboard

  const filteredPets = useMemo(() => pets.filter((pet) => {
    if (filters.gender && pet.gender !== filters.gender) return false
    if (filters.vaccinationStatus && pet.vaccinationStatus !== filters.vaccinationStatus) return false
    return true
  }), [filters.gender, filters.vaccinationStatus, pets])

  const loadPets = async (nextFilters = filters) => {
    const requestParams = {
      page: 1,
      limit: 100,
      search: nextFilters.search || undefined,
      species: nextFilters.species || undefined,
      breed: nextFilters.breed || undefined,
      minAge: nextFilters.minAge || undefined,
      maxAge: nextFilters.maxAge || undefined,
      minWeight: nextFilters.minWeight || undefined,
      maxWeight: nextFilters.maxWeight || undefined
    }
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/search/pets`, authConfig(token, { params: requestParams }))
    const nextPets = unwrap(data, 'pets', [])
    setPets(nextPets)
    return nextPets
  }

  const loadPetCollections = async (petId) => {
    if (!petId) {
      setRecords([])
      setVaccinations([])
      setReports([])
      return
    }
    const [recordResponse, vaccinationResponse, reportResponse] = await Promise.all([
      axios.get(`${backendUrl}/api/v1/veterinary/pets/${petId}/medical-records`, authConfig(token, { params: { limit: 100 } })),
      axios.get(`${backendUrl}/api/v1/veterinary/pets/${petId}/vaccinations`, authConfig(token, { params: { limit: 100 } })),
      axios.get(`${backendUrl}/api/v1/veterinary/ai-reports`, authConfig(token, { params: { petId, limit: 100 } }))
    ])
    setRecords(unwrap(recordResponse.data, 'records', []))
    setVaccinations(unwrap(vaccinationResponse.data, 'vaccinations', []))
    setReports(unwrap(reportResponse.data, 'reports', []))
  }

  const loadAll = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [nextPets, summaryResponse] = await Promise.all([
        loadPets(),
        axios.get(`${backendUrl}/api/v1/veterinary/dashboard/summary`, authConfig(token))
      ])
      setSummary(unwrap(summaryResponse.data, 'summary', null))

      if (view === 'edit-record' && params.recordId) {
        const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pet-medical-records/${params.recordId}`, authConfig(token))
        const record = unwrap(data, 'record', null)
        setRecordDraft(recordToDraft(record))
        await loadPetCollections(String(record?.petId || ''))
      } else {
        const currentPetId = selectedPetId || getId(nextPets[0])
        const pet = nextPets.find((item) => getId(item) === currentPetId) || nextPets[0] || null
        setSelectedPet(pet)
        if (pet) await loadPetCollections(getId(pet))
        if (view === 'create-record') setRecordDraft({ ...emptyRecord, petId: currentPetId || getId(pet) })
      }
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || 'Veterinary workspace data is temporarily unavailable.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [token, selectedPetId, view, params.recordId])

  const submitSearch = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loadPets(filters)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Pet search is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const saveRecord = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = buildRecordPayload(recordDraft)
      if (view === 'edit-record' && params.recordId) {
        const updatePayload = { ...payload }
        delete updatePayload.petId
        await axios.patch(`${backendUrl}/api/v1/veterinary/pet-medical-records/${params.recordId}`, updatePayload, authConfig(token))
        toast.success('Pet medical record updated')
      } else {
        await axios.post(`${backendUrl}/api/v1/veterinary/pet-medical-records`, payload, authConfig(token))
        toast.success('Pet medical record created')
      }
      navigate('/veterinarian-medical-records')
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not save this pet medical record.')
    } finally {
      setSaving(false)
    }
  }

  const saveVaccination = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = buildVaccinationPayload(vaccinationDraft)
      if (activeVaccination) {
        const updatePayload = { ...payload }
        delete updatePayload.petId
        await axios.patch(`${backendUrl}/api/v1/veterinary/vaccinations/${getId(activeVaccination)}`, updatePayload, authConfig(token))
        toast.success('Vaccination updated')
      } else {
        await axios.post(`${backendUrl}/api/v1/veterinary/vaccinations`, payload, authConfig(token))
        toast.success('Vaccination added')
      }
      setModal('')
      setActiveVaccination(null)
      await loadAll()
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not save this vaccination.')
    } finally {
      setSaving(false)
    }
  }

  const deleteVaccination = async (vaccination) => {
    setSaving(true)
    try {
      await axios.delete(`${backendUrl}/api/v1/veterinary/vaccinations/${getId(vaccination)}`, authConfig(token))
      toast.success('Vaccination deleted')
      await loadAll()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'We could not delete this vaccination.')
    } finally {
      setSaving(false)
    }
  }

  const saveAiReport = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await axios.post(`${backendUrl}/api/v1/veterinary/ai-reports`, buildAiPayload(aiDraft), authConfig(token))
      toast.success('AI preliminary assessment report created')
      setModal('')
      await loadAll()
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not save this AI report.')
    } finally {
      setSaving(false)
    }
  }

  if (!token || loading) return <Skeleton />
  if (error) return <main className='portal-page'><div className='portal-card mx-auto max-w-2xl p-10 text-center'><p className='portal-eyebrow'>Veterinary workspace</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Unable to load veterinary records</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button className='portal-button mt-6' onClick={loadAll}>Try again</button></div></main>

  const stats = summary?.stats || {}
  const petColumns = [
    { key: 'name', label: 'Pet name' },
    { key: 'species', label: 'Species' },
    { key: 'breed', label: 'Breed' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age', render: (pet) => pet.age ?? 'Not recorded' },
    { key: 'vaccinationStatus', label: 'Vaccination status' }
  ]
  const recordColumns = [
    { key: 'visitDate', label: 'Visit date', render: (record) => formatDate(record.visitDate) },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'symptoms', label: 'Symptoms', render: (record) => listText(record.symptoms) || 'Not recorded' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'followUpDate', label: 'Follow-up', render: (record) => formatDate(record.followUpDate) }
  ]
  const vaccinationColumns = [
    { key: 'vaccineName', label: 'Vaccine' },
    { key: 'dueDate', label: 'Due date', render: (item) => formatDate(item.dueDate) },
    { key: 'completedDate', label: 'Completed', render: (item) => formatDate(item.completedDate) },
    { key: 'nextDose', label: 'Next dose', render: (item) => formatDate(item.nextDose) },
    { key: 'notes', label: 'Notes' }
  ]

  const openVaccinationModal = (vaccination = null) => {
    setActiveVaccination(vaccination)
    setVaccinationDraft(vaccination ? vaccinationToDraft(vaccination) : { ...emptyVaccination, petId: getId(selectedPet) || getId(pets[0]) })
    setFormError('')
    setModal('vaccination')
  }

  return (
    <main className='portal-page'>
      <section className='flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
        <div><p className='portal-eyebrow'>{title[0]}</p><h1 className='portal-title'>{title[1]}</h1><p className='mt-2 max-w-3xl text-slate-600'>{title[2]}</p></div>
        <div className='flex flex-wrap gap-2'><button className='portal-button-secondary' onClick={() => navigate('/veterinarian-pets/search')}>Search pets</button><button className='portal-button' onClick={() => navigate('/veterinarian-medical-records/new')}>Create pet medical record</button></div>
      </section>

      {view === 'dashboard' && (
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard label='Assigned pets' value={stats.totalPets ?? pets.length} detail='Pets in your veterinary scope' />
            <StatCard label='Pet owners' value={stats.totalPetOwners ?? 0} detail='Owners connected to assigned pets' />
            <StatCard label='Vaccinations' value={stats.totalVaccinations ?? vaccinations.length} detail='Vaccination records in scope' />
            <StatCard label='AI reports' value={stats.totalAiReports ?? reports.length} detail='Preliminary assessment reports' />
          </div>
          <section><div className='mb-3 flex items-center justify-between'><h2 className='text-xl font-semibold text-ink'>Assigned pets</h2><button className='text-sm font-semibold text-primary' onClick={() => navigate('/veterinarian-pets')}>View all</button></div>{pets.length ? <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{pets.slice(0, 6).map((pet) => <PetCard key={getId(pet)} pet={pet} onOpen={(id) => navigate(`/veterinarian-pets/${id}`)} />)}</div> : <EmptyState title='No assigned pets yet' body='Pets appear here after a pet medical record or vaccination connects them to your veterinarian profile.' />}</section>
          <div className='grid gap-5 xl:grid-cols-2'><section><h2 className='mb-3 text-xl font-semibold text-ink'>Medical record summary</h2><DataTable columns={recordColumns} rows={records.slice(0, 5)} emptyTitle='No medical records found.' /></section><section><h2 className='mb-3 text-xl font-semibold text-ink'>Vaccination summary</h2><DataTable columns={vaccinationColumns.slice(0, 4)} rows={vaccinations.slice(0, 5)} emptyTitle='No vaccinations found.' /></section></div>
        </div>
      )}

      {(view === 'pets' || view === 'search') && (
        <div className='space-y-5'>
          <Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} />
          <DataTable columns={petColumns} rows={filteredPets} emptyTitle='No pets match the current search and filters.' renderActions={(pet) => <button className='font-semibold text-primary' onClick={() => navigate(`/veterinarian-pets/${getId(pet)}`)}>View details</button>} />
        </div>
      )}

      {view === 'pet-details' && selectedPet && (
        <div className='space-y-6'>
          <section className='portal-card grid gap-6 p-6 lg:grid-cols-[180px_1fr]'>
            <div className='aspect-square overflow-hidden rounded-lg bg-[#E7F4F5]'>{selectedPet.profileImage ? <img className='h-full w-full object-cover' src={selectedPet.profileImage} alt={selectedPet.name} /> : <div className='grid h-full place-items-center text-5xl font-semibold text-primary'>{String(selectedPet.name || 'P').slice(0, 1)}</div>}</div>
            <div>
              <div className='flex flex-wrap justify-between gap-4'><div><p className='portal-eyebrow'>Pet profile</p><h2 className='mt-2 text-3xl font-semibold text-ink'>{selectedPet.name}</h2><p className='mt-2 text-slate-600'>{selectedPet.species} {selectedPet.breed ? `- ${selectedPet.breed}` : ''}</p></div><div className='flex gap-2'><button className='portal-button-secondary' onClick={openVaccinationModal}>Add vaccination</button><button className='portal-button' onClick={() => navigate('/veterinarian-medical-records/new')}>Create record</button></div></div>
              <dl className='mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3'>{[['Gender', selectedPet.gender], ['Age', selectedPet.age ?? 'Not recorded'], ['Weight', selectedPet.weight ?? 'Not recorded'], ['Color', selectedPet.color], ['Microchip number', selectedPet.microchipNumber], ['Vaccination status', selectedPet.vaccinationStatus]].map(([label, value]) => <div key={label}><dt className='text-slate-500'>{label}</dt><dd className='mt-1 font-semibold text-ink'>{value || 'Not recorded'}</dd></div>)}</dl>
              <div className='mt-5 grid gap-4 text-sm md:grid-cols-2'><div><p className='font-semibold text-slate-700'>Allergies</p><p className='mt-1 text-slate-600'>{listText(selectedPet.allergies) || 'None recorded'}</p></div><div><p className='font-semibold text-slate-700'>Medical history</p><p className='mt-1 text-slate-600'>{listText(selectedPet.medicalHistory) || 'None recorded'}</p></div></div>
            </div>
          </section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>Medical records</h2><DataTable columns={recordColumns} rows={records} emptyTitle='No pet medical records found.' renderActions={(record) => <button className='font-semibold text-primary' onClick={() => navigate(`/veterinarian-medical-records/${getId(record)}/edit`)}>Edit</button>} /></section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>Vaccination history</h2><DataTable columns={vaccinationColumns} rows={vaccinations} emptyTitle='No vaccinations found.' renderActions={(vaccination) => <div className='flex gap-3'><button className='font-semibold text-primary' onClick={() => openVaccinationModal(vaccination)}>Edit</button><button className='font-semibold text-red-700' disabled={saving} onClick={() => deleteVaccination(vaccination)}>Delete</button></div>} /></section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>AI preliminary assessment reports</h2><div className='space-y-4'>{reports.map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports' body='AI preliminary assessment reports for this pet will appear here.' />}</div></section>
        </div>
      )}

      {view === 'records' && <DataTable columns={recordColumns} rows={records} emptyTitle='No pet medical records found.' renderActions={(record) => <button className='font-semibold text-primary' onClick={() => navigate(`/veterinarian-medical-records/${getId(record)}/edit`)}>Edit</button>} />}
      {view === 'create-record' && <div className='portal-card p-6'><RecordForm draft={recordDraft} setDraft={setRecordDraft} pets={pets} onSubmit={saveRecord} saving={saving} submitLabel='Create pet medical record' error={formError} onCancel={() => navigate('/veterinarian-medical-records')} /></div>}
      {view === 'edit-record' && <div className='portal-card p-6'><RecordForm draft={recordDraft} setDraft={setRecordDraft} pets={pets} onSubmit={saveRecord} saving={saving} submitLabel='Update pet medical record' error={formError} lockPet onCancel={() => navigate('/veterinarian-medical-records')} /></div>}
      {view === 'vaccinations' && <div className='space-y-4'><div className='flex justify-end'><button className='portal-button' onClick={openVaccinationModal}>Add vaccination</button></div><DataTable columns={vaccinationColumns} rows={vaccinations} emptyTitle='No vaccinations found.' renderActions={(vaccination) => <div className='flex gap-3'><button className='font-semibold text-primary' onClick={() => openVaccinationModal(vaccination)}>Edit</button><button className='font-semibold text-red-700' disabled={saving} onClick={() => deleteVaccination(vaccination)}>Delete</button></div>} /></div>}
      {view === 'ai' && <div className='space-y-4'><div className='flex justify-end'><button className='portal-button' onClick={() => { setAiDraft({ ...emptyAiReport, petId: getId(selectedPet) || getId(pets[0]) }); setFormError(''); setModal('ai') }}>Create AI report</button></div>{reports.map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports' body='AI preliminary assessment reports will appear here.' />}</div>}

      {modal === 'vaccination' && <Modal title={activeVaccination ? 'Update vaccination' : 'Add vaccination'} onClose={() => setModal('')}><VaccinationForm draft={vaccinationDraft} setDraft={setVaccinationDraft} pets={pets} onSubmit={saveVaccination} saving={saving} submitLabel={activeVaccination ? 'Update vaccination' : 'Add vaccination'} error={formError} /></Modal>}
      {modal === 'ai' && <Modal title='Create AI preliminary assessment report' onClose={() => setModal('')}><form className='space-y-4' onSubmit={saveAiReport}>{formError && <p className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{formError}</p>}<Field label='Pet'><select className='portal-field mt-1' required value={aiDraft.petId} onChange={(event) => setAiDraft({ ...aiDraft, petId: event.target.value })}><option value=''>Select pet</option>{pets.map((pet) => <option key={getId(pet)} value={getId(pet)}>{pet.name} - {pet.species}</option>)}</select></Field><Field label='Severity'><select className='portal-field mt-1' value={aiDraft.severity} onChange={(event) => setAiDraft({ ...aiDraft, severity: event.target.value })}><option value='low'>Low</option><option value='moderate'>Moderate</option><option value='high'>High</option><option value='urgent'>Urgent</option></select></Field><Field label='Symptoms'><input className='portal-field mt-1' required value={aiDraft.symptoms} onChange={(event) => setAiDraft({ ...aiDraft, symptoms: event.target.value })} placeholder='Comma separated' /></Field><Field label='Possible conditions'><input className='portal-field mt-1' required value={aiDraft.possibleConditions} onChange={(event) => setAiDraft({ ...aiDraft, possibleConditions: event.target.value })} placeholder='Comma separated' /></Field><label className='portal-label'>AI summary<textarea className='portal-field mt-1 min-h-28 resize-y' required value={aiDraft.aiSummary} onChange={(event) => setAiDraft({ ...aiDraft, aiSummary: event.target.value })} /></label><Field label='Recommendations'><input className='portal-field mt-1' required value={aiDraft.recommendations} onChange={(event) => setAiDraft({ ...aiDraft, recommendations: event.target.value })} placeholder='Comma separated' /></Field><Field label='Uploaded image URLs'><input className='portal-field mt-1' value={aiDraft.uploadedImages} onChange={(event) => setAiDraft({ ...aiDraft, uploadedImages: event.target.value })} placeholder='Comma separated' /></Field><button className='portal-button' disabled={saving}>{saving ? 'Saving...' : 'Create AI report'}</button></form></Modal>}
    </main>
  )
}

export default VeterinarianDashboard
