import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

import { AppContext } from '../../context/AppContext'
import { isAuthSessionHandledError } from '../../api/authClient'
import { useProtectedPatientRoute } from '../../hooks/useProtectedPatientRoute'
import { useNavigate, useParams } from '../../lib/routerCompat'
import { cleanVetName, normalizeDoctor } from '../../lib/veterinaryDisplay'
import AppointmentsView from './AppointmentsView'
import MedicalHistoryPage from './MedicalHistoryPage'
import { User, Bell, Shield, CreditCard, Globe, ChevronRight, KeyRound, Smartphone, Monitor, History, CheckCircle2 } from 'lucide-react'

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
  pets: ['My Pets', 'My Pets', 'Manage your pets\' profiles and health records'],
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

const PetImage = ({ src, alt, className, fallbackClassName, size = 'md' }) => {
  const [imgError, setImgError] = useState(false)
  const initial = String(alt || 'P').charAt(0).toUpperCase()
  const sizeClasses = {
    sm: 'h-10 w-10 text-base',
    md: 'h-12 w-12 text-lg',
    lg: 'h-14 w-14 text-xl',
    xl: 'h-24 w-24 text-3xl'
  }
  const baseClass = `${sizeClasses[size] || sizeClasses.md} shrink-0 rounded-full object-cover`
  if (src && !imgError) {
    return <img src={src} alt={alt} onError={() => setImgError(true)} className={`${baseClass} ${className || ''}`} />
  }
  return (
    <div className={`${baseClass} ${fallbackClassName || 'bg-teal/10 text-teal'} grid place-items-center font-bold`} >
      {initial}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const normalized = String(status || '').toLowerCase()
  const isHealthy = normalized === 'up-to-date' || normalized === 'healthy' || normalized === 'good'
  const isAttention = normalized === 'needs attention' || normalized === 'overdue' || normalized === 'due' || normalized === 'attention'
  if (isAttention) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800'>
        Needs Attention
      </span>
    )
  }
  if (isHealthy) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700'>
        Healthy
      </span>
    )
  }
  return (
    <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600'>
      {String(status || 'Unknown')}
    </span>
  )
}

const PetSelectorCard = ({ pet, isSelected, onSelect, onEdit, onDelete }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
      isSelected
        ? 'border-teal bg-teal/5'
        : 'border-line/70 bg-white hover:border-teal/30 hover:bg-mist'
    }`}
  >
    <PetImage src={pet.profileImage} alt={pet.name} size="lg" fallbackClassName="bg-teal/10 text-teal" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-ink">{pet.name}</p>
      <p className="truncate text-xs text-muted">{pet.breed || pet.species || 'Breed not set'}</p>
    </div>
    <StatusBadge status={pet.vaccinationStatus} />
  </button>
)

const PetProfileView = ({ pet, activeTab, setActiveTab, records, vaccinations, reports, onEdit, onDelete }) => {
  const healthStatus = pet.vaccinationStatus || 'unknown'
  const isHealthy = healthStatus === 'up-to-date' || healthStatus === 'healthy' || healthStatus === 'good'
  const statusLabel = isHealthy ? 'Healthy' : 'Needs Attention'
  const statusColor = isHealthy ? 'text-emerald-600' : 'text-amber-600'
  const ageValue = pet.age ? `${pet.age} ${Number(pet.age) === 1 ? 'year' : 'years'}` : 'Not recorded'
  const weightValue = pet.weight ? `${pet.weight} kg` : 'Not recorded'
  const breedValue = pet.breed || 'Not recorded'
  const speciesValue = pet.species || 'Not recorded'
  const dobValue = pet.dateOfBirth ? formatDate(pet.dateOfBirth) : 'Not recorded'
  const genderValue = pet.gender || 'Not recorded'
  const microchipValue = pet.microchipNumber || 'Not recorded'
  const primaryVetValue = pet.primaryVet || 'Not assigned'
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vaccinations', label: 'Vaccinations' },
    { id: 'history', label: 'Health History' }
  ]
  return (
    <article className='mf-card overflow-hidden'>
      <div className='relative h-32 w-full rounded-t-2xl bg-gradient-to-r from-teal to-emerald-600' />
      <div className='relative flex flex-col items-center px-6 pb-6'>
        <div className='-mt-12 mb-4 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#E7F4F5] text-3xl font-bold text-teal'>
          <PetImage src={pet.profileImage} alt={pet.name} size='xl' fallbackClassName='bg-teal/10 text-teal' />
        </div>
        <h2 className='text-2xl font-bold text-ink'>{pet.name}</h2>
        <p className={`mt-1 text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
        <p className='mt-1 text-sm text-muted'>{breedValue} · {speciesValue}</p>
      </div>
      <div className='border-t border-line px-6 py-5'>
        <dl className='grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'>
          <div><dt className='text-slate-500'>Date of Birth</dt><dd className='mt-1 font-semibold text-ink'>{dobValue}</dd></div>
          <div><dt className='text-slate-500'>Age</dt><dd className='mt-1 font-semibold text-ink'>{ageValue}</dd></div>
          <div><dt className='text-slate-500'>Weight</dt><dd className='mt-1 font-semibold text-ink'>{weightValue}</dd></div>
          <div><dt className='text-slate-500'>Gender</dt><dd className='mt-1 font-semibold text-ink'>{genderValue}</dd></div>
          <div><dt className='text-slate-500'>Primary Vet</dt><dd className='mt-1 font-semibold text-ink'>{primaryVetValue}</dd></div>
          <div><dt className='text-slate-500'>Microchip</dt><dd className='mt-1 font-semibold text-ink'>{microchipValue}</dd></div>
        </dl>
      </div>
      <div className='border-t border-line px-6 py-4'>
        <div className='flex flex-wrap gap-2'>
          {tabs.map((tab) => (
            <button key={tab.id} type='button' onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-teal/10 text-teal' : 'text-muted hover:bg-mist hover:text-ink'}`}>{tab.label}</button>
          ))}
        </div>
      </div>
      <div className='px-6 pb-6'>
        {activeTab === 'overview' && (
          <div className='grid gap-6 text-sm md:grid-cols-2'>
            <div className='rounded-xl border border-line/70 bg-[#F6F9F9] p-4'>
              <p className='font-semibold text-slate-700'>Health Summary</p>
              <p className='mt-2 text-slate-600'>{pet.medicalHistory && pet.medicalHistory.length ? listText(pet.medicalHistory) : 'No health summary available.'}</p>
            </div>
            <div className='rounded-xl border border-line/70 bg-[#F6F9F9] p-4'>
              <p className='font-semibold text-slate-700'>Vaccination Status</p>
              <p className='mt-2 text-slate-600'>{pet.vaccinationStatus ? `Vaccination status: ${pet.vaccinationStatus}` : 'Vaccination status not recorded.'}</p>
            </div>
          </div>
        )}
        {activeTab === 'vaccinations' && (
          <DataTable columns={[{ key: 'vaccineName', label: 'Vaccine' }, { key: 'dueDate', label: 'Due date', render: (item) => formatDate(item.dueDate) }, { key: 'completedDate', label: 'Completed', render: (item) => formatDate(item.completedDate) }, { key: 'nextDose', label: 'Next dose', render: (item) => formatDate(item.nextDose) }, { key: 'notes', label: 'Notes' }]} rows={vaccinations} emptyTitle='No vaccination history found.' />
        )}
        {activeTab === 'history' && (
          <DataTable columns={[{ key: 'visitDate', label: 'Visit date', render: (record) => formatDate(record.visitDate) }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'symptoms', label: 'Symptoms', render: (record) => listText(record.symptoms) || 'Not recorded' }, { key: 'treatment', label: 'Treatment' }, { key: 'followUpDate', label: 'Follow-up', render: (record) => formatDate(record.followUpDate) }]} rows={records} emptyTitle='No medical records found.' />
        )}
      </div>
      <div className='border-t border-line px-6 py-4'>
        <div className='flex flex-wrap gap-3'>
          <button type='button' className='mf-button-secondary' onClick={onEdit}>Edit pet</button>
          <button type='button' className='rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50' onClick={onDelete}>Delete pet</button>
        </div>
      </div>
    </article>
  )
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
        <PetImage src={pet.profileImage} alt={pet.name} size='xl' fallbackClassName='bg-teal/10 text-teal' />
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
     <div className='w-full min-w-0 overflow-x-auto'>
       <table className='w-full min-w-[600px] text-left text-sm'>
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
  <form className='mf-card grid w-full min-w-0 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4' onSubmit={onSearch}>
    <input className='mf-field mt-0 sm:col-span-2' placeholder='Search by name, breed, species' value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
    <input className='mf-field mt-0' placeholder='Species' value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value })} />
    <input className='mf-field mt-0' placeholder='Breed' value={filters.breed} onChange={(event) => setFilters({ ...filters, breed: event.target.value })} />
    <select className='mf-field mt-0' value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })}><option value=''>Gender</option><option>Female</option><option>Male</option><option>Spayed Female</option><option>Neutered Male</option></select>
    <input className='mf-field mt-0' min='0' type='number' placeholder='Min age' value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Max age' value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Min weight' value={filters.minWeight} onChange={(event) => setFilters({ ...filters, minWeight: event.target.value })} />
    <input className='mf-field mt-0' min='0' type='number' placeholder='Max weight' value={filters.maxWeight} onChange={(event) => setFilters({ ...filters, maxWeight: event.target.value })} />
    <select className='mf-field mt-0 sm:col-span-2' value={filters.vaccinationStatus} onChange={(event) => setFilters({ ...filters, vaccinationStatus: event.target.value })}><option value=''>Vaccination status</option><option value='up-to-date'>Up to date</option><option value='due'>Due</option><option value='overdue'>Overdue</option><option value='partial'>Partial</option><option value='unknown'>Unknown</option></select>
    <button className='mf-button mt-0 sm:col-span-2 lg:col-span-4' type='submit'>Search pets</button>
  </form>
)

const SettingsToggle = ({ checked, onChange }) => (
  <button
    type='button'
    role='switch'
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-teal' : 'bg-slate-200'}`}
  >
    <span
      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
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
  const { authStatus, backendUrl, token, userData } = useContext(AppContext)
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
  const [selectedPetInList, setSelectedPetInList] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [settingsTab, setSettingsTab] = useState('profile')
  const [notificationPrefs, setNotificationPrefs] = useState({
    vaccinationReminders: true,
    appointmentConfirmations: true,
    appointmentReminders: true,
    aiReportReady: true,
    smsNotifications: false,
    pushNotifications: true,
    healthTips: false,
    newsletter: false
  })

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
        setAppointments(asArray(data.appointments))
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

  useEffect(() => {
    if (view === 'pets' && pets.length && !selectedPetInList) {
      setSelectedPetInList(pets[0])
    }
  }, [view, pets, selectedPetInList])

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

  const saveNotificationPrefs = (event) => {
    event.preventDefault()
    toast.success('Notification preferences saved')
  }

  // ---- Security (reuses existing backend APIs; see backend authRoutes) ----
  const [twoFactorStatus, setTwoFactorStatus] = useState(null)
  const [twoFactorSetup, setTwoFactorSetup] = useState(null)
  const [sessionsList, setSessionsList] = useState([])
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryCodesList, setRecoveryCodesList] = useState([])
  const [securityModal, setSecurityModal] = useState('')
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changePasswordError, setChangePasswordError] = useState('')

  const loadSecurity = async () => {
    if (!token) return
    setSecurityError('')
    try {
      const [statusResponse, sessionsResponse] = await Promise.all([
        axios.get(`${backendUrl}/api/v1/auth/2fa/status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/v1/auth/sessions`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTwoFactorStatus(statusResponse.data?.data?.status ?? null)
      setSessionsList(sessionsResponse.data?.data?.sessions ?? [])
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setSecurityError(requestError.response?.data?.message || 'Security settings are temporarily unavailable.')
      }
    }
  }

  const handleBegin2FASetup = async () => {
    setSecurityLoading(true)
    setSecurityError('')
    try {
      const { data } = await axios.post(`${backendUrl}/api/v1/auth/2fa/setup/begin`, {}, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      setTwoFactorSetup(data?.data?.setup ?? null)
      toast.success(data?.message || '2FA setup started')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || requestError.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleConfirm2FASetup = async () => {
    setSecurityLoading(true)
    setSecurityError('')
    try {
      const { data } = await axios.post(`${backendUrl}/api/v1/auth/2fa/setup/confirm`, { totpCode }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      setRecoveryCodesList(data?.data?.recoveryCodes ?? [])
      setTwoFactorSetup(null)
      setTotpCode('')
      await loadSecurity()
      toast.success(data?.message || '2FA enabled')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || requestError.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setSecurityLoading(true)
    setSecurityError('')
    try {
      await axios.post(`${backendUrl}/api/v1/auth/2fa/disable`, { password: twoFactorPassword, totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      setTwoFactorPassword('')
      setTotpCode('')
      setRecoveryCode('')
      await loadSecurity()
      toast.success('Two-factor authentication disabled')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || requestError.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      await axios.delete(`${backendUrl}/api/v1/auth/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      await loadSecurity()
      toast.success('Session revoked')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || requestError.message)
    }
  }

  const handleRevokeOtherSessions = async () => {
    setSecurityLoading(true)
    try {
      await axios.post(`${backendUrl}/api/v1/auth/sessions/revoke-others`, {}, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      await loadSecurity()
      toast.success('Other sessions revoked')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || requestError.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  const submitChangePassword = async (event) => {
    event.preventDefault()
    setChangePasswordError('')
    const { currentPassword, newPassword, confirmPassword } = changePasswordForm
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('Please fill in all password fields.')
      return
    }
    if (newPassword.length < 8) {
      setChangePasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match.')
      return
    }
    // The backend currently has NO authenticated change-password endpoint.
    // Only the email-based /reset-password flow exists, which requires a reset token.
    // We do NOT fake this call; settings are validated and the limitation is surfaced.
    setChangePasswordError('Backend support for in-account password changes is not yet available. Please use "Forgot Password" to reset your password via email.')
  }

  const settingsNavItems = [
    { key: 'profile', label: 'Profile', desc: 'Personal details, photo, contact info', icon: User },
    { key: 'notifications', label: 'Notifications', desc: 'Alerts, reminders, and emails', icon: Bell },
    { key: 'security', label: 'Security', desc: 'Password, 2FA, sessions', icon: Shield },
    { key: 'billing', label: 'Billing & Plan', desc: 'Subscription, invoices, payment', icon: CreditCard },
    { key: 'preferences', label: 'Preferences', desc: 'Language, timezone, appearance', icon: Globe }
  ]

  const togglePref = (key) => setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (view === 'profile' && settingsTab === 'security' && token) {
      void loadSecurity()
    }
  }, [view, settingsTab, token])

  const placeholderSections = {
    billing: { title: 'Billing & Plan', desc: 'Subscription, invoices, payment' },
    preferences: { title: 'Preferences', desc: 'Language, timezone, appearance' }
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
    <section className='w-full min-w-0 py-10'>
      {view !== 'medical' && view !== 'profile' && (
        <section className='mb-7 flex flex-col justify-between gap-5 border-b border-line pb-7 lg:flex-row lg:items-end'>
          <div>
            <p className='mf-eyebrow'>{title[0]}</p>
            <h1 className='mf-title'>{title[1]}</h1>
            <p className='mf-copy'>{title[2]}</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            {view === 'pets' ? (
              <button className='mf-button' onClick={() => { setDraft(petDraft); setFormError(''); setModal('register') }}>+ Add Pet</button>
            ) : (
              <>
                <button className='mf-button-secondary' onClick={() => navigate('/pet-owner/pets')}>My pets</button>
                <button className='mf-button' onClick={() => { setDraft(petDraft); setFormError(''); view === 'register' ? setModal('register') : navigate('/pet-owner/pets/register') }}>Register pet</button>
              </>
            )}
          </div>
        </section>
      )}

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
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {pets.map((pet) => (
              <PetSelectorCard
                key={getId(pet)}
                pet={pet}
                isSelected={selectedPetInList && getId(selectedPetInList) === getId(pet)}
                onSelect={() => setSelectedPetInList(pet)}
                onEdit={() => openEdit(pet)}
                onDelete={() => { setSelectedPet(pet); setFormError(''); setModal('delete') }}
              />
            ))}
          </div>
          {pets.length === 0 && <EmptyState title='No pets registered' body='Register your first pet to unlock veterinary records, vaccination history, and AI reports.' actionLabel='Add Pet' onAction={() => { setDraft(petDraft); setFormError(''); setModal('register') }} />}

          {selectedPetInList && (
            <PetProfileView
              pet={selectedPetInList}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              records={records}
              vaccinations={vaccinations}
              reports={reports}
              onEdit={() => openEdit(selectedPetInList)}
              onDelete={() => { setSelectedPet(selectedPetInList); setFormError(''); setModal('delete') }}
            />
          )}
        </div>
      )}

      {view === 'pet-details' && selectedPet && (
        <div className='space-y-6'>
          <section className='mf-card grid gap-6 p-6 lg:grid-cols-[220px_1fr]'>
            <div className='aspect-square w-full max-w-[220px] overflow-hidden rounded-lg bg-[#E7F4F5]'><PetImage src={selectedPet.profileImage} alt={selectedPet.name} size='xl' fallbackClassName='bg-teal/10 text-teal' /></div>
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

      {view === 'medical' && (
        <MedicalHistoryPage
          pets={pets}
          records={records}
          onMyPets={() => navigate('/pet-owner/pets')}
          onBrowseVets={() => navigate('/doctors')}
          onRegisterPet={() => navigate('/pet-owner/pets/register')}
        />
      )}
      {view === 'vaccinations' && <DataTable columns={vaccinationColumns} rows={vaccinations} emptyTitle='No vaccination history found.' />}
      {view === 'ai' && <div className='space-y-4'>{reports.map((report) => <AiReportCard key={getId(report)} report={report} />)}{reports.length === 0 && <EmptyState title='No AI reports' body='Preliminary assessment reports will appear here.' />}</div>}
      {view === 'appointments' && <AppointmentsView appointments={appointments} pets={pets} onRefresh={loadAll} />}

      {view === 'profile' && (
        <div className='w-full min-w-0 space-y-6'>
          {/* Settings header */}
          <div>
            <h1 className='text-2xl font-bold text-ink'>Settings</h1>
            <p className='mt-1 text-sm text-muted'>Account and preferences</p>
          </div>

          {/* Two-column settings layout */}
          <div className='grid gap-6 lg:grid-cols-[300px_1fr]'>
            {/* Left settings nav card */}
            <aside className='h-fit rounded-2xl border border-line/70 bg-white p-2 shadow-soft'>
              {settingsNavItems.map((item) => {
                const active = settingsTab === item.key
                return (
                  <button
                    key={item.key}
                    type='button'
                    onClick={() => setSettingsTab(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 ${
                      active ? 'bg-teal/10 text-teal' : 'text-muted hover:bg-mist hover:text-ink'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-teal' : 'text-slate-400'}`} />
                    <span className='min-w-0 flex-1'>
                      <span className={`block text-sm font-bold ${active ? 'text-teal' : 'text-ink'}`}>{item.label}</span>
                      <span className={`mt-0.5 block text-xs ${active ? 'text-teal/70' : 'text-muted'}`}>{item.desc}</span>
                    </span>
                    {active && <ChevronRight className='h-4 w-4 shrink-0 text-teal' />}
                  </button>
                )
              })}
            </aside>

            {/* Right content card */}
            {settingsTab === 'profile' && (
              <form onSubmit={saveOwner} className='rounded-2xl border border-line/70 bg-white p-6 shadow-soft sm:p-8'>
                {formError && <div role='alert' className='mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{formError}</div>}

                <div>
                  <h2 className='text-xl font-bold text-ink'>Profile Information</h2>
                  <p className='mt-1 text-sm text-muted'>Update your name, email, and contact details.</p>
                </div>

                <div className='mt-6 flex flex-col gap-4 rounded-2xl border border-line/70 bg-[#F6F9F9] p-5 sm:flex-row sm:items-center'>
                  {userData?.image ? (
                    <img src={userData.image} alt={userData.name || 'Pet owner'} className='h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-white' />
                  ) : (
                    <div className='grid h-16 w-16 shrink-0 place-items-center rounded-full bg-teal/15 text-xl font-bold text-teal ring-4 ring-white'>
                      {String(userData?.name || 'P').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className='min-w-0'>
                    <p className='truncate text-base font-bold text-ink'>{userData?.name || 'Pet Owner'}</p>
                    <p className='mt-0.5 truncate text-sm text-muted'>{userData?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className='mt-6 grid gap-5 sm:grid-cols-2'>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>First Name</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={String(userData?.name || '').split(' ')[0] || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>Last Name</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={String(userData?.name || '').split(' ').slice(1).join(' ') || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>Email Address</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={userData?.email || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>Phone Number</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={ownerForm.phone}
                      onChange={(event) => setOwnerForm({ ...ownerForm, phone: event.target.value })}
                      placeholder='Enter phone number'
                    />
                  </div>
                  <div className='sm:col-span-2'>
                    <label className='text-[13px] font-semibold text-ink'>Location</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={[ownerForm.address?.line1, ownerForm.address?.line2].filter(Boolean).join(', ')}
                      onChange={(event) => {
                        const [line1 = '', line2 = ''] = event.target.value.split(/,(.+)/)
                        setOwnerForm({ ...ownerForm, address: { line1: line1.trim(), line2: (line2 || '').trim() } })
                      }}
                      placeholder='City, State'
                    />
                  </div>
                </div>

                <div className='mt-5 grid gap-5 border-t border-line/70 pt-5 sm:grid-cols-2'>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>Emergency Contact</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={ownerForm.emergencyContact}
                      onChange={(event) => setOwnerForm({ ...ownerForm, emergencyContact: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className='text-[13px] font-semibold text-ink'>Emergency Phone</label>
                    <input
                      className='mf-field mt-1.5 !py-3'
                      value={ownerForm.emergencyPhone}
                      onChange={(event) => setOwnerForm({ ...ownerForm, emergencyPhone: event.target.value })}
                    />
                  </div>
                </div>

                <div className='mt-6 border-t border-line/70 pt-5'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-bold text-ink'>My Pets ({pets.length})</h3>
                    <button
                      type='button'
                      onClick={() => navigate('/pet-owner/pets')}
                      className='text-xs font-semibold text-teal hover:text-teal/80'
                    >
                      View all →
                    </button>
                  </div>
                  {pets.length ? (
                    <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                      {pets.slice(0, 6).map((pet) => (
                        <div key={getId(pet)} className='flex items-center gap-3 rounded-xl border border-line/70 bg-[#F6F9F9] p-3'>
                          <PetImage src={pet.profileImage} alt={pet.name} size='md' fallbackClassName='bg-teal/10 text-teal' />
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-bold text-ink'>{pet.name}</p>
                            <p className='truncate text-xs text-muted'>{pet.breed || pet.species || 'Pet'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='mt-3 rounded-xl border border-dashed border-line/80 bg-[#F6F9F9] px-4 py-3 text-sm text-muted'>
                      No pets registered yet.
                    </p>
                  )}
                </div>

                <div className='mt-6 flex justify-end'>
                  <button className='mf-button !px-8 !py-3 text-sm' disabled={saving} type='submit'>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {settingsTab === 'notifications' && (
              <form onSubmit={saveNotificationPrefs} className='rounded-2xl border border-line/70 bg-white p-6 shadow-soft sm:p-8'>
                <div>
                  <h2 className='text-xl font-bold text-ink'>Notification Preferences</h2>
                  <p className='mt-1 text-sm text-muted'>Choose how and when you want to be notified.</p>
                </div>

                {/* Health & Reminders */}
                <div className='mt-6'>
                  <h3 className='text-sm font-bold uppercase tracking-wide text-ink'>Health & Reminders</h3>
                  <div className='mt-3 divide-y divide-line/70 rounded-2xl border border-line/70'>
                    {[
                      { key: 'vaccinationReminders', title: 'Vaccination Reminders', desc: 'Get notified 30 days before vaccine due dates' },
                      { key: 'appointmentConfirmations', title: 'Appointment Confirmations', desc: 'Email and SMS when bookings are confirmed' },
                      { key: 'appointmentReminders', title: 'Appointment Reminders', desc: '24h and 1h reminders before appointments' },
                      { key: 'aiReportReady', title: 'AI Report Ready', desc: 'Alert when a new AI health report is generated' }
                    ].map((item) => (
                      <div key={item.key} className='flex items-center justify-between gap-4 px-5 py-4'>
                        <div className='min-w-0'>
                          <p className='text-sm font-bold text-ink'>{item.title}</p>
                          <p className='mt-0.5 text-xs leading-5 text-muted'>{item.desc}</p>
                        </div>
                        <SettingsToggle checked={notificationPrefs[item.key]} onChange={() => togglePref(item.key)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channels */}
                <div className='mt-8'>
                  <h3 className='text-sm font-bold uppercase tracking-wide text-ink'>Channels</h3>
                  <div className='mt-3 divide-y divide-line/70 rounded-2xl border border-line/70'>
                    {[
                      { key: 'smsNotifications', title: 'SMS Notifications', desc: 'Text messages to the user\'s actual phone number' },
                      { key: 'pushNotifications', title: 'Push Notifications', desc: 'Mobile app alerts' },
                      { key: 'healthTips', title: 'Health Tips', desc: 'Weekly wellness tips for your pets' },
                      { key: 'newsletter', title: 'VetFlow Newsletter', desc: 'Monthly product updates and pet care guides' }
                    ].map((item) => (
                      <div key={item.key} className='flex items-center justify-between gap-4 px-5 py-4'>
                        <div className='min-w-0'>
                          <p className='text-sm font-bold text-ink'>{item.title}</p>
                          <p className='mt-0.5 text-xs leading-5 text-muted'>{item.desc}</p>
                        </div>
                        <SettingsToggle checked={notificationPrefs[item.key]} onChange={() => togglePref(item.key)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className='mt-8 flex justify-end'>
                  <button className='mf-button !px-8 !py-3 text-sm' type='submit'>
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {settingsTab === 'security' && (
              <div className='rounded-2xl border border-line/70 bg-white p-6 shadow-soft sm:p-8'>
                <div>
                  <h2 className='text-xl font-bold text-ink'>Security Settings</h2>
                  <p className='mt-1 text-sm text-muted'>Keep your account safe.</p>
                </div>
                {securityError && <div role='alert' className='mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{securityError}<button type='button' className='ml-3 font-semibold underline' onClick={loadSecurity}>Retry</button></div>}

                {/* Change password */}
                <div className='mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line/70 p-5'>
                  <div className='flex items-center gap-3'>
                    <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal'><KeyRound className='h-5 w-5' /></span>
                    <div>
                      <p className='text-sm font-bold text-ink'>Change Password</p>
                      <p className='mt-0.5 text-xs text-muted'>Update the password for your account</p>
                    </div>
                  </div>
                  <button type='button' onClick={() => { setChangePasswordError(''); setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setSecurityModal('change-password') }} className='mf-button !px-5 !py-2 text-xs'>Update</button>
                </div>

                {/* Two-factor authentication */}
                <div className='mt-4 rounded-2xl border border-line/70 p-5'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal'><Smartphone className='h-5 w-5' /></span>
                      <div>
                        <p className='text-sm font-bold text-ink'>Two-Factor Authentication</p>
                        <p className='mt-0.5 text-xs text-muted'>
                          {twoFactorStatus?.enabled ? '2FA is enabled on your account' : 'Add an extra layer of security'}
                        </p>
                      </div>
                    </div>
                    {twoFactorStatus?.enabled ? (
                      <button type='button' onClick={() => { setTwoFactorPassword(''); setTotpCode(''); setRecoveryCode(''); setSecurityModal('disable-2fa') }} className='rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50' disabled={securityLoading}>Disable</button>
                    ) : (
                      <button type='button' onClick={handleBegin2FASetup} className='mf-button !px-5 !py-2 text-xs' disabled={securityLoading}>Enable</button>
                    )}
                  </div>

                  {twoFactorSetup && (
                    <div className='mt-4 rounded-xl border border-line/70 bg-[#F6F9F9] p-4'>
                      <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
                        {twoFactorSetup.qrCodeDataUrl && <img className='h-40 w-40 shrink-0 rounded-xl border border-line bg-white' src={twoFactorSetup.qrCodeDataUrl} alt='Authenticator QR code' />}
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs font-semibold text-ink'>Scan this QR in your authenticator app, then enter the 6-digit code.</p>
                          {twoFactorSetup.otpauthUri && <textarea readOnly value={twoFactorSetup.otpauthUri} className='mf-field mt-3 font-mono text-xs' rows='2' />}
                          <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center'>
                            <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className='mf-field !py-2 font-mono' placeholder='6-digit code' />
                            <button type='button' disabled={securityLoading || totpCode.length !== 6} onClick={handleConfirm2FASetup} className='mf-button !px-5 !py-2 text-xs'>Confirm setup</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {recoveryCodesList.length > 0 && (
                    <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4'>
                      <p className='text-xs font-bold text-amber-900'>Recovery codes</p>
                      <p className='mt-1 text-xs text-amber-800'>Store these codes securely. Each can be used once.</p>
                      <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'>{recoveryCodesList.map((code) => <code key={code} className='rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-center text-xs font-mono'>{code}</code>)}</div>
                    </div>
                  )}
                </div>

                {/* Active sessions */}
                <div className='mt-4 rounded-2xl border border-line/70 p-5'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal'><Monitor className='h-5 w-5' /></span>
                      <div>
                        <p className='text-sm font-bold text-ink'>Active Sessions</p>
                        <p className='mt-0.5 text-xs text-muted'>{sessionsList.length ? `${sessionsList.length} active session(s)` : 'No active sessions'}</p>
                      </div>
                    </div>
                    {sessionsList.length > 1 && <button type='button' onClick={handleRevokeOtherSessions} className='mf-button-secondary !px-4 !py-2 text-xs' disabled={securityLoading}>Sign out all other</button>}
                  </div>
                  <div className='mt-4 space-y-3'>
                    {sessionsList.map((session) => (
                      <div key={session.sessionId} className='flex items-center justify-between gap-3 rounded-xl border border-line/70 p-4'>
                        <div className='min-w-0'>
                          <p className='flex items-center gap-2 text-sm font-semibold text-ink'>
                            {session.displayName || session.device || 'Session'}
                            {session.current && <span className='rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal'>Current</span>}
                          </p>
                          <p className='mt-0.5 text-xs text-muted'>Last active {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'Unknown'}</p>
                        </div>
                        {!session.current && <button type='button' onClick={() => handleRevokeSession(session.sessionId)} className='rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50'>Revoke</button>}
                      </div>
                    ))}
                    {sessionsList.length === 0 && <p className='rounded-xl border border-dashed border-line/80 bg-[#F6F9F9] px-4 py-6 text-center text-sm text-muted'>No active sessions found.</p>}
                  </div>
                </div>

                {/* Login history */}
                <div className='mt-4 rounded-2xl border border-line/70 p-5'>
                  <div className='flex items-center gap-3'>
                    <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal'><History className='h-5 w-5' /></span>
                    <div>
                      <p className='text-sm font-bold text-ink'>Login History</p>
                      <p className='mt-0.5 text-xs text-muted'>Review authentication activity on your account</p>
                    </div>
                  </div>
                  <p className='mt-4 rounded-xl border border-dashed border-line/80 bg-[#F6F9F9] px-4 py-5 text-center text-sm text-muted'>
                    Login history is not yet available — the backend does not currently expose an authentication-log endpoint.
                  </p>
                </div>
              </div>
            )}

            {placeholderSections[settingsTab] && (
              <div className='rounded-2xl border border-line/70 bg-white p-6 shadow-soft sm:p-8'>
                <h2 className='text-xl font-bold text-ink'>{placeholderSections[settingsTab].title}</h2>
                <p className='mt-1 text-sm text-muted'>{placeholderSections[settingsTab].desc}</p>
                <p className='mt-6 rounded-xl border border-dashed border-line/80 bg-[#F6F9F9] px-4 py-6 text-center text-sm text-muted'>
                  This section is coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {securityModal === 'change-password' && (
        <Modal title='Change Password' onClose={() => setSecurityModal('')}>
          <form onSubmit={submitChangePassword} className='space-y-4'>
            {changePasswordError && <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{changePasswordError}</div>}
            <div>
              <label className='text-[13px] font-semibold text-ink'>Current Password</label>
              <input type='password' className='mf-field mt-1.5 !py-3' value={changePasswordForm.currentPassword} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })} />
            </div>
            <div>
              <label className='text-[13px] font-semibold text-ink'>New Password</label>
              <input type='password' className='mf-field mt-1.5 !py-3' value={changePasswordForm.newPassword} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })} placeholder='At least 8 characters' />
            </div>
            <div>
              <label className='text-[13px] font-semibold text-ink'>Confirm New Password</label>
              <input type='password' className='mf-field mt-1.5 !py-3' value={changePasswordForm.confirmPassword} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })} />
            </div>
            <div className='flex justify-end gap-3 pt-2'>
              <button type='button' className='mf-button-secondary !py-2.5 text-sm' onClick={() => setSecurityModal('')}>Cancel</button>
              <button type='submit' className='mf-button !py-2.5 text-sm'>Update</button>
            </div>
          </form>
        </Modal>
      )}

      {securityModal === 'disable-2fa' && (
        <Modal title='Disable Two-Factor Authentication' onClose={() => setSecurityModal('')}>
          <form onSubmit={(e) => { e.preventDefault(); handleDisable2FA() }} className='space-y-4'>
            <p className='text-sm leading-6 text-muted'>To disable 2FA, provide your password and one of the following: an authenticator code or a recovery code.</p>
            <div>
              <label className='text-[13px] font-semibold text-ink'>Password</label>
              <input type='password' className='mf-field mt-1.5 !py-3' value={twoFactorPassword} onChange={(e) => setTwoFactorPassword(e.target.value)} />
            </div>
            <div>
              <label className='text-[13px] font-semibold text-ink'>Authenticator Code</label>
              <input className='mf-field mt-1.5 !py-3 font-mono' value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder='6-digit code' />
            </div>
            <div>
              <label className='text-[13px] font-semibold text-ink'>Recovery Code</label>
              <input className='mf-field mt-1.5 !py-3 font-mono' value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
            </div>
            <div className='flex justify-end gap-3 pt-2'>
              <button type='button' className='mf-button-secondary !py-2.5 text-sm' onClick={() => setSecurityModal('')}>Cancel</button>
              <button type='submit' disabled={securityLoading} className='rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60'>{securityLoading ? 'Disabling...' : 'Disable 2FA'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'register' && <Modal title='Register pet' onClose={() => setModal('')}><PetForm draft={draft} setDraft={setDraft} onSubmit={savePet} saving={saving} submitLabel='Register pet' error={formError} /></Modal>}
      {modal === 'edit' && <Modal title='Edit pet' onClose={() => setModal('')}><PetForm draft={draft} setDraft={setDraft} onSubmit={savePet} saving={saving} submitLabel='Update pet' error={formError} /></Modal>}
      {modal === 'delete' && selectedPet && <Modal title='Delete confirmation' onClose={() => setModal('')}><div className='space-y-4'><p className='text-sm leading-6 text-slate-600'>Delete {selectedPet.name}? This removes the pet profile and connected veterinary records from the veterinary database.</p>{formError && <p className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{formError}</p>}<div className='flex gap-3'><button type='button' disabled={saving} className='rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60' onClick={deletePet}>{saving ? 'Deleting...' : 'Delete pet'}</button><button type='button' className='mf-button-secondary' onClick={() => setModal('')}>Cancel</button></div></div></Modal>}
    </section>
  )
}

export default PetOwnerDashboard