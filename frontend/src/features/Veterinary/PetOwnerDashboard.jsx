import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

import { AppContext } from '../../context/AppContext'
import { isAuthSessionHandledError } from '../../api/authClient'
import { useProtectedPatientRoute } from '../../hooks/useProtectedPatientRoute'
import { useNavigate, useParams } from '../../lib/routerCompat'
import { cleanVetName } from '../../lib/veterinaryDisplay'

const petDraft = {
  name: '',
  species: '',
  breed: '',
  gender: 'Not Selected',
  age: '',
  weight: '',
  color: '',
  dateOfBirth: '',
  microchipNumber: '',
  vaccinationStatus: 'unknown',
  allergies: '',
  medicalHistory: '',
  profileImage: ''
}

const ownerDraft = {
  phone: '',
  address: { line1: '', line2: '' },
  emergencyContact: '',
  emergencyPhone: ''
}

const pageTitles = {
  dashboard: ['Veterinary care', 'Pet owner dashboard', 'Manage pets, preliminary AI reports, vaccinations, visits, and upcoming appointments.'],
  pets: ['Pet management', 'My pets', 'Register, update, delete, and review every pet profile connected to your account.'],
  register: ['Pet management', 'Register pet', 'Add a new pet profile for your veterinary clinic records.'],
  'pet-details': ['Pet profile', 'Pet details', 'Review identity, health, vaccination, medical history, and AI preliminary assessment data.'],
  medical: ['Pet medical records', 'Medical history', 'A complete timeline of pet medical records shared by veterinary care teams.'],
  vaccinations: ['Vaccination records', 'Vaccination history', 'Track completed doses, upcoming due dates, and veterinarian notes.'],
  ai: ['AI reports', 'AI preliminary assessment reports', 'Review AI summaries and recommendations with the required clinical warning.'],
  appointments: ['Veterinary appointments', 'Upcoming appointments', 'Review upcoming appointments from your existing appointment schedule.'],
  profile: ['Owner profile', 'Owner profile', 'Maintain emergency and contact details for the veterinary clinic.']
}

const getId = (item) => String(item?._id || item?.id || '')
const asArray = (items) => Array.isArray(items) ? items : []
const listText = (items) => asArray(items).join(', ')
const parseList = (value) => [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))]
const dateValue = (value) => value ? String(value).slice(0, 10) : ''
const formatDate = (value) => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const petToDraft = (pet) => ({
  name: pet?.name || '',
  species: pet?.species || '',
  breed: pet?.breed || '',
  gender: pet?.gender || 'Not Selected',
  age: pet?.age ?? '',
  weight: pet?.weight ?? '',
  color: pet?.color || '',
  dateOfBirth: dateValue(pet?.dateOfBirth),
  microchipNumber: pet?.microchipNumber || '',
  vaccinationStatus: pet?.vaccinationStatus || 'unknown',
  allergies: listText(pet?.allergies),
  medicalHistory: listText(pet?.medicalHistory),
  profileImage: pet?.profileImage || ''
})

const buildPetPayload = (draft) => ({
  name: draft.name.trim(),
  species: draft.species.trim(),
  breed: draft.breed.trim(),
  gender: draft.gender,
  ...(draft.age !== '' ? { age: Number(draft.age) } : {}),
  ...(draft.weight !== '' ? { weight: Number(draft.weight) } : {}),
  color: draft.color.trim(),
  ...(draft.dateOfBirth ? { dateOfBirth: draft.dateOfBirth } : {}),
  ...(draft.microchipNumber.trim() ? { microchipNumber: draft.microchipNumber.trim() } : {}),
  vaccinationStatus: draft.vaccinationStatus,
  allergies: parseList(draft.allergies),
  medicalHistory: parseList(draft.medicalHistory),
  profileImage: draft.profileImage.trim()
})

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
})

const unwrap = (responseData, key, fallback) => responseData?.data?.[key] ?? responseData?.[key] ?? fallback

const Skeleton = () => (
  <div className='space-y-5 py-10'>
    <div className='h-36 animate-pulse rounded-lg bg-[#E7F4F5]' />
    <div className='grid gap-5 lg:grid-cols-3'>
      <div className='h-44 animate-pulse rounded-lg bg-white' />
      <div className='h-44 animate-pulse rounded-lg bg-white' />
      <div className='h-44 animate-pulse rounded-lg bg-white' />
    </div>
    <div className='h-80 animate-pulse rounded-lg bg-white' />
  </div>
)

const EmptyState = ({ title, body, actionLabel, onAction }) => (
  <div className='mf-card p-8 text-center'>
    <p className='font-semibold text-ink'>{title}</p>
    <p className='mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600'>{body}</p>
    {actionLabel && <button type='button' className='mf-button mt-5' onClick={onAction}>{actionLabel}</button>}
  </div>
)

const Field = ({ label, children }) => (
  <label className='mf-label'>
    {label}
    {children}
  </label>
)

const PetForm = ({ draft, setDraft, onSubmit, saving, submitLabel, onCancel, error }) => (
  <form className='space-y-5' onSubmit={onSubmit}>
    {error && <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
    <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <Field label='Pet name'><input className='mf-field' required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
      <Field label='Species'><input className='mf-field' required value={draft.species} onChange={(event) => setDraft({ ...draft, species: event.target.value })} placeholder='Dog, cat, rabbit' /></Field>
      <Field label='Breed'><input className='mf-field' value={draft.breed} onChange={(event) => setDraft({ ...draft, breed: event.target.value })} /></Field>
      <Field label='Gender'><select className='mf-field' value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option>Not Selected</option><option>Female</option><option>Male</option><option>Spayed Female</option><option>Neutered Male</option></select></Field>
      <Field label='Age'><input className='mf-field' min='0' type='number' value={draft.age} onChange={(event) => setDraft({ ...draft, age: event.target.value })} /></Field>
      <Field label='Weight'><input className='mf-field' min='0' step='0.1' type='number' value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} /></Field>
      <Field label='Color'><input className='mf-field' value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></Field>
      <Field label='Date of birth'><input className='mf-field' type='date' value={draft.dateOfBirth} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })} /></Field>
      <Field label='Microchip number'><input className='mf-field' value={draft.microchipNumber} onChange={(event) => setDraft({ ...draft, microchipNumber: event.target.value })} /></Field>
      <Field label='Vaccination status'><select className='mf-field' value={draft.vaccinationStatus} onChange={(event) => setDraft({ ...draft, vaccinationStatus: event.target.value })}><option value='unknown'>Unknown</option><option value='up-to-date'>Up to date</option><option value='due'>Due</option><option value='overdue'>Overdue</option><option value='partial'>Partial</option></select></Field>
      <Field label='Photo URL'><input className='mf-field' value={draft.profileImage} onChange={(event) => setDraft({ ...draft, profileImage: event.target.value })} placeholder='https://...' /></Field>
      <Field label='Allergies'><input className='mf-field' value={draft.allergies} onChange={(event) => setDraft({ ...draft, allergies: event.target.value })} placeholder='Separate with commas' /></Field>
      <label className='mf-label sm:col-span-2 lg:col-span-3'>Medical history<textarea className='mf-field min-h-28 resize-y' value={draft.medicalHistory} onChange={(event) => setDraft({ ...draft, medicalHistory: event.target.value })} placeholder='Separate multiple entries with commas' /></label>
    </section>
    <div className='flex flex-wrap gap-3'>
      <button className='mf-button' disabled={saving} type='submit'>{saving ? 'Saving...' : submitLabel}</button>
      {onCancel && <button className='mf-button-secondary' disabled={saving} type='button' onClick={onCancel}>Cancel</button>}
    </div>
  </form>
)

const Modal = ({ title, children, onClose }) => (
  <div className='fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 py-6'>
    <div className='mf-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6'>
      <div className='mb-5 flex items-start justify-between gap-4'>
        <h2 className='text-xl font-semibold text-ink'>{title}</h2>
        <button type='button' className='grid h-9 w-9 place-items-center rounded-md border border-line text-xl text-slate-600' onClick={onClose} aria-label='Close modal'>&times;</button>
      </div>
      {children}
    </div>
  </div>
)

const StatCard = ({ label, value, detail }) => (
  <article className='mf-card p-5'>
    <p className='text-sm font-semibold text-slate-500'>{label}</p>
    <p className='mt-2 text-3xl font-semibold text-ink'>{value}</p>
    <p className='mt-2 text-sm text-slate-600'>{detail}</p>
  </article>
)

const PetSummaryCard = ({ pet, onOpen }) => (
  <article className='mf-card overflow-hidden'>
    <div className='flex gap-4 p-5'>
      <div className='h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#E7F4F5]'>
        {pet.profileImage ? <img className='h-full w-full object-cover' src={pet.profileImage} alt={pet.name} /> : <div className='grid h-full place-items-center text-2xl font-semibold text-primary'>{String(pet.name || 'P').slice(0, 1)}</div>}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-lg font-semibold text-ink'>{pet.name}</p>
        <p className='mt-1 text-sm text-slate-600'>{pet.species || 'Species not set'} {pet.breed ? `- ${pet.breed}` : ''}</p>
        <p className='mt-2 text-xs font-semibold uppercase text-teal'>{pet.vaccinationStatus || 'unknown'}</p>
      </div>
    </div>
    <div className='border-t border-line px-5 py-3'>
      <button type='button' className='text-sm font-semibold text-primary' onClick={() => onOpen(getId(pet))}>View pet profile</button>
    </div>
  </article>
)

const DataTable = ({ columns, rows, emptyTitle, renderActions }) => (
  <div className='mf-card overflow-hidden'>
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[760px] text-left text-sm'>
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

const Filters = ({ filters, setFilters, onSearch }) => (
  <form className='mf-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6' onSubmit={onSearch}>
    <input className='mf-field mt-0 lg:col-span-2' placeholder='Search by name, breed, species' value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
    <input className='mf-field mt-0' placeholder='Species' value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value })} />
    <input className='mf-field mt-0' placeholder='Breed' value={filters.breed} onChange={(event) => setFilters({ ...filters, breed: event.target.value })} />
    <select className='mf-field mt-0' value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })}><option value=''>Gender</option><option>Female</option><option>Male</option><option>Spayed Female</option><option>Neutered Male</option></select>
    <button className='mf-button' type='submit'>Search pets</button>
    <input className='mf-field mt-0' min='0' type='number' placeholder='Min age' value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Max age' value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Min weight' value={filters.minWeight} onChange={(event) => setFilters({ ...filters, minWeight: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Max weight' value={filters.maxWeight} onChange={(event) => setFilters({ ...filters, maxWeight: event.target.value })} />
    <select className='mf-field mt-0 lg:col-span-2' value={filters.vaccinationStatus} onChange={(event) => setFilters({ ...filters, vaccinationStatus: event.target.value })}><option value=''>Vaccination status</option><option value='up-to-date'>Up to date</option><option value='due'>Due</option><option value='overdue'>Overdue</option><option value='partial'>Partial</option><option value='unknown'>Unknown</option></select>
  </form>
)

const AiReportCard = ({ report }) => (
  <article className='mf-card p-5'>
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

const PetOwnerDashboard = ({ view = 'dashboard', initialAction = '' }) => {
  const params = useParams()
  const navigate = useNavigate()
  const { authStatus, backendUrl, token } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })

  const [pets, setPets] = useState([])
  const [selectedPet, setSelectedPet] = useState(null)
  const [records, setRecords] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [reports, setReports] = useState([])
  const [appointments, setAppointments] = useState([])
  const [ownerProfile, setOwnerProfile] = useState(ownerDraft)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [draft, setDraft] = useState(petDraft)
  const [ownerForm, setOwnerForm] = useState(ownerDraft)
  const [filters, setFilters] = useState({ search: '', species: '', breed: '', gender: '', minAge: '', maxAge: '', minWeight: '', maxWeight: '', vaccinationStatus: '' })

  const selectedPetId = params.petId || ''
  const title = pageTitles[view] || pageTitles.dashboard

  const filteredPets = useMemo(() => pets.filter((pet) => {
    if (filters.gender && pet.gender !== filters.gender) return false
    if (filters.vaccinationStatus && pet.vaccinationStatus !== filters.vaccinationStatus) return false
    return true
  }), [filters.gender, filters.vaccinationStatus, pets])

  const loadPets = async (nextFilters = filters) => {
    const params = {
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
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pets`, authConfig(token, { params }))
    const nextPets = unwrap(data, 'pets', [])
    setPets(nextPets)
    return nextPets
  }

  const loadPetCollections = async (petId) => {
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
      const nextPets = await loadPets()
      const currentPetId = selectedPetId || getId(nextPets[0])
      if (currentPetId) {
        const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pets/${currentPetId}`, authConfig(token))
        const pet = unwrap(data, 'pet', null)
        setSelectedPet(pet)
        await loadPetCollections(currentPetId)
      } else {
        setSelectedPet(null)
        setRecords([])
        setVaccinations([])
        setReports([])
      }
      if (view === 'appointments') {
        const { data } = await axios.get(`${backendUrl}/api/user/appointments`, { headers: { token } })
        setAppointments(asArray(data.appointments).filter((item) => !item.cancelled && !item.isCompleted))
      }
      if (view === 'profile') {
        try {
          const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pet-owners/profile`, authConfig(token))
          const owner = { ...ownerDraft, ...(unwrap(data, 'petOwner', {}) || {}) }
          setOwnerProfile(owner)
          setOwnerForm(owner)
        } catch (profileError) {
          setOwnerProfile(ownerDraft)
          setOwnerForm(ownerDraft)
        }
      }
      if (initialAction === 'edit' && currentPetId) {
        const pet = nextPets.find((item) => getId(item) === currentPetId)
        setDraft(petToDraft(pet))
        setModal('edit')
      }
      if (initialAction === 'delete' && currentPetId) setModal('delete')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || 'Veterinary records are temporarily unavailable.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [token, selectedPetId, view])

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

  const savePet = async (event) => {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = buildPetPayload(draft)
      if (modal === 'edit' && selectedPet) {
        await axios.put(`${backendUrl}/api/v1/veterinary/pets/${getId(selectedPet)}`, payload, authConfig(token))
        toast.success('Pet profile updated')
      } else {
        await axios.post(`${backendUrl}/api/v1/veterinary/pets`, payload, authConfig(token))
        toast.success('Pet registered')
      }
      setModal('')
      setDraft(petDraft)
      if (view === 'register') navigate('/pet-owner/pets')
      await loadAll()
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not save this pet profile.')
    } finally {
      setSaving(false)
    }
  }

  const deletePet = async () => {
    if (!selectedPet) return
    setSaving(true)
    try {
      await axios.delete(`${backendUrl}/api/v1/veterinary/pets/${getId(selectedPet)}`, authConfig(token))
      toast.success('Pet profile deleted')
      setModal('')
      navigate('/pet-owner/pets')
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not delete this pet profile.')
    } finally {
      setSaving(false)
    }
  }

  const saveOwner = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        phone: ownerForm.phone,
        address: ownerForm.address,
        emergencyContact: ownerForm.emergencyContact,
        emergencyPhone: ownerForm.emergencyPhone
      }
      const request = ownerProfile?._id
        ? axios.put(`${backendUrl}/api/v1/veterinary/pet-owners/profile`, payload, authConfig(token))
        : axios.post(`${backendUrl}/api/v1/veterinary/pet-owners`, payload, authConfig(token))
      const { data } = await request
      const owner = { ...ownerDraft, ...(unwrap(data, 'petOwner', {}) || {}) }
      setOwnerProfile(owner)
      setOwnerForm(owner)
      toast.success('Owner profile saved')
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'We could not save the owner profile.')
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'initializing' || (!token && authStatus !== 'authenticated')) return <Skeleton />
  if (loading) return <Skeleton />
  if (error) return <section className='py-14'><div className='mf-card mx-auto max-w-2xl p-10 text-center'><p className='mf-eyebrow'>Veterinary records</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Unable to load pet care records</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button className='mf-button mt-6' onClick={loadAll}>Try again</button></div></section>

  const openEdit = (pet = selectedPet) => {
    setSelectedPet(pet)
    setDraft(petToDraft(pet))
    setFormError('')
    setModal('edit')
  }

  const petColumns = [
    { key: 'name', label: 'Pet name' },
    { key: 'species', label: 'Species' },
    { key: 'breed', label: 'Breed' },
    { key: 'age', label: 'Age', render: (pet) => pet.age ?? 'Not recorded' },
    { key: 'weight', label: 'Weight', render: (pet) => pet.weight ? `${pet.weight}` : 'Not recorded' },
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

  return (
    <main className='py-10'>
      <section className='mb-7 flex flex-col justify-between gap-5 border-b border-line pb-7 lg:flex-row lg:items-end'>
        <div>
          <p className='mf-eyebrow'>{title[0]}</p>
          <h1 className='mf-title'>{title[1]}</h1>
          <p className='mf-copy'>{title[2]}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button className='mf-button-secondary' onClick={() => navigate('/pet-owner/pets')}>My pets</button>
          <button className='mf-button' onClick={() => { setDraft(petDraft); setFormError(''); view === 'register' ? setModal('register') : navigate('/pet-owner/pets/register') }}>Register pet</button>
        </div>
      </section>

      {view === 'dashboard' && (
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <StatCard label='Pets' value={pets.length} detail='Registered pet profiles' />
            <StatCard label='Vaccinations' value={vaccinations.length} detail='Recent and upcoming vaccine records' />
            <StatCard label='Pet medical records' value={records.length} detail='Latest records for selected pet' />
            <StatCard label='AI reports' value={reports.length} detail='Preliminary assessment reports' />
          </div>
          <section>
            <div className='mb-3 flex items-center justify-between'><h2 className='text-xl font-semibold text-ink'>Pet summary</h2><button className='text-sm font-semibold text-primary' onClick={() => navigate('/pet-owner/pets')}>View all</button></div>
            {pets.length ? <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{pets.slice(0, 6).map((pet) => <PetSummaryCard key={getId(pet)} pet={pet} onOpen={(id) => navigate(`/pet-owner/pets/${id}`)} />)}</div> : <EmptyState title='No pets registered' body='Register your first pet to unlock veterinary records, vaccination history, and AI reports.' actionLabel='Register pet' onAction={() => navigate('/pet-owner/pets/register')} />}
          </section>
          <div className='grid gap-5 lg:grid-cols-2'>
            <section><h2 className='mb-3 text-xl font-semibold text-ink'>Vaccination summary</h2><DataTable columns={vaccinationColumns.slice(0, 4)} rows={vaccinations.slice(0, 5)} emptyTitle='No vaccination records yet.' /></section>
            <section><h2 className='mb-3 text-xl font-semibold text-ink'>AI report summary</h2><div className='space-y-3'>{reports.slice(0, 2).map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports yet' body='Preliminary reports will appear here after they are created.' />}</div></section>
          </div>
        </div>
      )}

      {view === 'register' && <div className='mf-card p-6'><PetForm draft={draft} setDraft={setDraft} onSubmit={savePet} saving={saving} submitLabel='Register pet' error={formError} onCancel={() => navigate('/pet-owner/pets')} /></div>}

      {view === 'pets' && (
        <div className='space-y-5'>
          <Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} />
          <DataTable columns={petColumns} rows={filteredPets} emptyTitle='No pets match the current search and filters.' renderActions={(pet) => <div className='flex gap-3'><button className='font-semibold text-primary' onClick={() => navigate(`/pet-owner/pets/${getId(pet)}`)}>View</button><button className='font-semibold text-primary' onClick={() => openEdit(pet)}>Edit</button></div>} />
        </div>
      )}

      {view === 'pet-details' && selectedPet && (
        <div className='space-y-6'>
          <section className='mf-card grid gap-6 p-6 lg:grid-cols-[220px_1fr]'>
            <div className='aspect-square overflow-hidden rounded-lg bg-[#E7F4F5]'>{selectedPet.profileImage ? <img className='h-full w-full object-cover' src={selectedPet.profileImage} alt={selectedPet.name} /> : <div className='grid h-full place-items-center text-5xl font-semibold text-primary'>{String(selectedPet.name || 'P').slice(0, 1)}</div>}</div>
            <div>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div><p className='mf-eyebrow'>Pet profile</p><h2 className='mt-2 text-3xl font-semibold text-ink'>{selectedPet.name}</h2><p className='mt-2 text-slate-600'>{selectedPet.species} {selectedPet.breed ? `- ${selectedPet.breed}` : ''}</p></div>
                <div className='flex gap-2'><button className='mf-button-secondary' onClick={() => openEdit(selectedPet)}>Edit pet</button><button className='rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50' onClick={() => { setFormError(''); setModal('delete') }}>Delete pet</button></div>
              </div>
              <dl className='mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3'>
                {[['Gender', selectedPet.gender], ['Age', selectedPet.age ?? 'Not recorded'], ['Weight', selectedPet.weight ?? 'Not recorded'], ['Color', selectedPet.color], ['Microchip number', selectedPet.microchipNumber], ['Vaccination status', selectedPet.vaccinationStatus]].map(([label, value]) => <div key={label}><dt className='text-slate-500'>{label}</dt><dd className='mt-1 font-semibold text-ink'>{value || 'Not recorded'}</dd></div>)}
              </dl>
              <div className='mt-5 grid gap-4 text-sm md:grid-cols-2'>
                <div><p className='font-semibold text-slate-700'>Allergies</p><p className='mt-1 text-slate-600'>{listText(selectedPet.allergies) || 'None recorded'}</p></div>
                <div><p className='font-semibold text-slate-700'>Medical history</p><p className='mt-1 text-slate-600'>{listText(selectedPet.medicalHistory) || 'None recorded'}</p></div>
              </div>
            </div>
          </section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>Previous visits</h2><DataTable columns={recordColumns} rows={records} emptyTitle='No pet medical records found.' /></section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>Vaccination history</h2><DataTable columns={vaccinationColumns} rows={vaccinations} emptyTitle='No vaccination history found.' /></section>
          <section><h2 className='mb-3 text-xl font-semibold text-ink'>AI preliminary assessment reports</h2><div className='space-y-4'>{reports.map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports' body='AI preliminary assessment reports for this pet will appear here.' />}</div></section>
        </div>
      )}

      {view === 'medical' && <DataTable columns={recordColumns} rows={records} emptyTitle='No pet medical records found.' />}
      {view === 'vaccinations' && <DataTable columns={vaccinationColumns} rows={vaccinations} emptyTitle='No vaccination history found.' />}
      {view === 'ai' && <div className='space-y-4'>{reports.map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports' body='Preliminary assessment reports will appear here.' />}</div>}
      {view === 'appointments' && <DataTable columns={[{ key: 'docData', label: 'Veterinarian', render: (item) => cleanVetName(item.docData?.name) || 'Veterinarian' }, { key: 'slotDate', label: 'Date', render: (item) => formatDate(item.slotDate) }, { key: 'slotTime', label: 'Time' }, { key: 'payment', label: 'Payment', render: (item) => item.payment ? 'Paid' : 'Pending' }]} rows={appointments} emptyTitle='No upcoming appointments found.' />}
      {view === 'profile' && (
        <form className='mf-card grid gap-4 p-6 sm:grid-cols-2' onSubmit={saveOwner}>
          {formError && <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2'>{formError}</div>}
          <Field label='Phone'><input className='mf-field' value={ownerForm.phone} onChange={(event) => setOwnerForm({ ...ownerForm, phone: event.target.value })} /></Field>
          <Field label='Emergency contact'><input className='mf-field' value={ownerForm.emergencyContact} onChange={(event) => setOwnerForm({ ...ownerForm, emergencyContact: event.target.value })} /></Field>
          <Field label='Emergency phone'><input className='mf-field' value={ownerForm.emergencyPhone} onChange={(event) => setOwnerForm({ ...ownerForm, emergencyPhone: event.target.value })} /></Field>
          <Field label='Address line 1'><input className='mf-field' value={ownerForm.address?.line1 || ''} onChange={(event) => setOwnerForm({ ...ownerForm, address: { ...(ownerForm.address || {}), line1: event.target.value } })} /></Field>
          <label className='mf-label sm:col-span-2'>Address line 2<input className='mf-field' value={ownerForm.address?.line2 || ''} onChange={(event) => setOwnerForm({ ...ownerForm, address: { ...(ownerForm.address || {}), line2: event.target.value } })} /></label>
          <div className='sm:col-span-2'><button className='mf-button' disabled={saving} type='submit'>{saving ? 'Saving...' : 'Save owner profile'}</button></div>
        </form>
      )}

      {modal === 'register' && <Modal title='Register pet' onClose={() => setModal('')}><PetForm draft={draft} setDraft={setDraft} onSubmit={savePet} saving={saving} submitLabel='Register pet' error={formError} /></Modal>}
      {modal === 'edit' && <Modal title='Edit pet' onClose={() => setModal('')}><PetForm draft={draft} setDraft={setDraft} onSubmit={savePet} saving={saving} submitLabel='Update pet' error={formError} /></Modal>}
      {modal === 'delete' && selectedPet && <Modal title='Delete confirmation' onClose={() => setModal('')}><div className='space-y-4'><p className='text-sm leading-6 text-slate-600'>Delete {selectedPet.name}? This removes the pet profile and connected veterinary records from the veterinary database.</p>{formError && <p className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{formError}</p>}<div className='flex gap-3'><button type='button' disabled={saving} className='rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60' onClick={deletePet}>{saving ? 'Deleting...' : 'Delete pet'}</button><button type='button' className='mf-button-secondary' onClick={() => setModal('')}>Cancel</button></div></div></Modal>}
    </main>
  )
}

export default PetOwnerDashboard
