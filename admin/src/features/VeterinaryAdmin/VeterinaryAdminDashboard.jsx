"use client";

import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { isAuthSessionHandledError } from '../../api/authClient'
import { useNavigate } from '../../lib/routerCompat'

const getId = (item) => String(item?._id || item?.id || '')
const asArray = (items) => Array.isArray(items) ? items : []
const listText = (items) => asArray(items).join(', ')
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
const unwrapPagination = (responseData) => responseData?.data?.pagination ?? responseData?.pagination ?? {}

const titles = {
  dashboard: ['Veterinary administration', 'Veterinary dashboard', 'Administrative overview for pet owners, pets, veterinarians, vaccinations, records, and AI reports.'],
  owners: ['Pet owners', 'Pet owners management', 'Search and review veterinary pet owner profiles.'],
  pets: ['Pets', 'Pets management', 'Search, filter, and review pet profiles across the veterinary clinic.'],
  veterinarians: ['Veterinarians', 'Veterinarians management', 'Search and filter veterinarian profiles by specialization and experience.'],
  vaccinations: ['Vaccinations', 'Vaccinations', 'Review vaccination history and upcoming due dates.'],
  records: ['Pet medical records', 'Pet medical records', 'Search and review pet medical records across the veterinary clinic.'],
  reports: ['AI reports', 'AI reports', 'Review preliminary AI assessment reports.'],
  analytics: ['Veterinary analytics', 'Veterinary analytics', 'Operational analytics for registrations, vaccinations, records, AI reports, and veterinarian activity.']
}

const Skeleton = () => (
  <main className='portal-page'>
    <div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' />
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, index) => <div className='h-32 animate-pulse rounded-lg bg-white' key={index} />)}
    </div>
    <div className='h-96 animate-pulse rounded-lg bg-white' />
  </main>
)

const StatCard = ({ label, value, detail }) => (
  <article className='portal-card p-5'>
    <p className='text-sm font-semibold text-slate-500'>{label}</p>
    <p className='mt-2 text-3xl font-semibold text-ink'>{value ?? 0}</p>
    <p className='mt-2 text-sm text-slate-600'>{detail}</p>
  </article>
)

const EmptyState = ({ title, body }) => (
  <div className='portal-card p-8 text-center'>
    <p className='font-semibold text-ink'>{title}</p>
    <p className='mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600'>{body}</p>
  </div>
)

const DataTable = ({ columns, rows, emptyTitle, loading }) => (
  <div className='portal-card overflow-hidden'>
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[860px] text-left text-sm'>
        <thead className='bg-[#E7F4F5] text-xs uppercase text-slate-600'>
          <tr>{columns.map((column) => <th className='px-4 py-3 font-semibold' key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody className='divide-y divide-line bg-white'>
          {rows.map((row) => (
            <tr className='hover:bg-mist' key={getId(row)}>
              {columns.map((column) => <td className='px-4 py-3 text-slate-700' key={column.key}>{column.render ? column.render(row) : row[column.key] || 'Not recorded'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {loading && <div className='p-8 text-center text-sm text-slate-600'>Loading records...</div>}
    {!loading && rows.length === 0 && <div className='p-8 text-center text-sm text-slate-600'>{emptyTitle}</div>}
  </div>
)

const Pagination = ({ pagination, onPage }) => {
  const page = pagination.page || 1
  const pages = pagination.pages || 1
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
      <p>Page {page} of {pages} - {pagination.total || 0} records</p>
      <div className='flex gap-2'>
        <button className='portal-button-secondary' disabled={page <= 1} onClick={() => onPage(page - 1)} type='button'>Previous</button>
        <button className='portal-button-secondary' disabled={page >= pages} onClick={() => onPage(page + 1)} type='button'>Next</button>
      </div>
    </div>
  )
}

const Filters = ({ filters, setFilters, onSearch, mode }) => (
  <form className='portal-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6' onSubmit={onSearch}>
    <input className='portal-field xl:col-span-2' value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={mode === 'owners' ? 'Search owners' : mode === 'veterinarians' ? 'Search veterinarians' : 'Search records'} />
    {(mode === 'pets' || mode === 'records' || mode === 'vaccinations' || mode === 'reports') && <input className='portal-field' value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value })} placeholder='Species' />}
    {(mode === 'pets' || mode === 'records' || mode === 'vaccinations' || mode === 'reports') && <input className='portal-field' value={filters.breed} onChange={(event) => setFilters({ ...filters, breed: event.target.value })} placeholder='Breed' />}
    {mode === 'pets' && <select className='portal-field' value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })}><option value=''>Gender</option><option>Female</option><option>Male</option><option>Spayed Female</option><option>Neutered Male</option></select>}
    {mode === 'pets' && <select className='portal-field' value={filters.vaccinationStatus} onChange={(event) => setFilters({ ...filters, vaccinationStatus: event.target.value })}><option value=''>Vaccination status</option><option value='up-to-date'>Up to date</option><option value='due'>Due</option><option value='overdue'>Overdue</option><option value='partial'>Partial</option><option value='unknown'>Unknown</option></select>}
    {mode === 'pets' && <input className='portal-field' min='0' type='number' value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: event.target.value })} placeholder='Min age' />}
    {mode === 'pets' && <input className='portal-field' min='0' type='number' value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: event.target.value })} placeholder='Max age' />}
    {mode === 'veterinarians' && <input className='portal-field' value={filters.specialization} onChange={(event) => setFilters({ ...filters, specialization: event.target.value })} placeholder='Specialization' />}
    {mode === 'veterinarians' && <input className='portal-field' min='0' type='number' value={filters.minExperience} onChange={(event) => setFilters({ ...filters, minExperience: event.target.value })} placeholder='Min experience' />}
    <button className='portal-button' type='submit'>Search</button>
  </form>
)

const ChartCard = ({ title, items }) => {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <article className='portal-card p-5'>
      <h2 className='text-lg font-semibold text-ink'>{title}</h2>
      <div className='mt-5 space-y-3'>
        {items.map((item) => (
          <div className='grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm' key={item.label}>
            <p className='truncate font-medium text-slate-600'>{item.label}</p>
            <div className='h-3 overflow-hidden rounded-full bg-[#E7F4F5]'>
              <div className='h-full rounded-full bg-primary' style={{ width: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }} />
            </div>
            <p className='text-right font-semibold text-ink'>{item.value}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

const monthKey = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

const countBy = (items, getLabel) => {
  const counts = new Map()
  items.forEach((item) => {
    const label = getLabel(item) || 'Unknown'
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
}

const VeterinaryAdminDashboard = ({ view = 'dashboard' }) => {
  const navigate = useNavigate()
  const { aToken } = useContext(AdminContext)
  const { backendUrl } = useContext(AppContext)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [stats, setStats] = useState({})
  const [petOwners, setPetOwners] = useState([])
  const [pets, setPets] = useState([])
  const [veterinarians, setVeterinarians] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [records, setRecords] = useState([])
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', species: '', breed: '', gender: '', minAge: '', maxAge: '', vaccinationStatus: '', specialization: '', minExperience: '' })

  const title = titles[view] || titles.dashboard

  const loadPets = async (page = 1, limit = 20, nextFilters = filters) => {
    const params = {
      page,
      limit,
      search: nextFilters.search || undefined,
      species: nextFilters.species || undefined,
      breed: nextFilters.breed || undefined,
      minAge: nextFilters.minAge || undefined,
      maxAge: nextFilters.maxAge || undefined
    }
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pets`, authConfig(aToken, { params }))
    setPets(unwrap(data, 'pets', []))
    setPagination(unwrapPagination(data))
    return unwrap(data, 'pets', [])
  }

  const loadOwners = async (page = 1, limit = 20) => {
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/search/pet-owners`, authConfig(aToken, { params: { page, limit, search: filters.search || undefined } }))
    setPetOwners(unwrap(data, 'petOwners', []))
    setPagination(unwrapPagination(data))
  }

  const loadVeterinarians = async (page = 1, limit = 20) => {
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/search/veterinarians`, authConfig(aToken, { params: { page, limit, search: filters.search || filters.specialization || undefined } }))
    const items = unwrap(data, 'veterinarians', []).filter((vet) => {
      const matchesSpecialization = !filters.specialization || asArray(vet.specialization).some((item) => item.toLowerCase().includes(filters.specialization.toLowerCase()))
      const matchesExperience = !filters.minExperience || Number(vet.yearsOfExperience || 0) >= Number(filters.minExperience)
      return matchesSpecialization && matchesExperience
    })
    setVeterinarians(items)
    setPagination(unwrapPagination(data))
  }

  const loadReports = async (page = 1, limit = 20) => {
    const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/ai-reports`, authConfig(aToken, { params: { page, limit, search: filters.search || undefined } }))
    setReports(unwrap(data, 'reports', []))
    setPagination(unwrapPagination(data))
  }

  const loadNestedCollections = async (petItems, nextFilters = filters) => {
    const visiblePets = petItems.filter((pet) => {
      const species = !nextFilters.species || String(pet.species || '').toLowerCase().includes(nextFilters.species.toLowerCase())
      const breed = !nextFilters.breed || String(pet.breed || '').toLowerCase().includes(nextFilters.breed.toLowerCase())
      return species && breed
    })
    const [vaccinationResponses, recordResponses] = await Promise.all([
      Promise.all(visiblePets.slice(0, 30).map((pet) => axios.get(`${backendUrl}/api/v1/veterinary/pets/${getId(pet)}/vaccinations`, authConfig(aToken, { params: { limit: 100, search: nextFilters.search || undefined } })).catch(() => null))),
      Promise.all(visiblePets.slice(0, 30).map((pet) => axios.get(`${backendUrl}/api/v1/veterinary/pets/${getId(pet)}/medical-records`, authConfig(aToken, { params: { limit: 100, search: nextFilters.search || undefined } })).catch(() => null)))
    ])
    const nextVaccinations = vaccinationResponses.flatMap((response) => unwrap(response?.data, 'vaccinations', []))
    const nextRecords = recordResponses.flatMap((response) => unwrap(response?.data, 'records', []))
    setVaccinations(nextVaccinations)
    setRecords(nextRecords)
    return { vaccinations: nextVaccinations, records: nextRecords }
  }

  const loadDashboard = async () => {
    const [statsResponse, summaryResponse, petResponse, reportResponse, vetResponse] = await Promise.all([
      axios.get(`${backendUrl}/api/v1/veterinary/dashboard/stats`, authConfig(aToken)),
      axios.get(`${backendUrl}/api/v1/veterinary/dashboard/summary`, authConfig(aToken)),
      axios.get(`${backendUrl}/api/v1/veterinary/pets`, authConfig(aToken, { params: { page: 1, limit: 100 } })),
      axios.get(`${backendUrl}/api/v1/veterinary/ai-reports`, authConfig(aToken, { params: { page: 1, limit: 100 } })),
      axios.get(`${backendUrl}/api/v1/veterinary/veterinarians`, authConfig(aToken, { params: { page: 1, limit: 100 } }))
    ])
    const nextPets = unwrap(petResponse.data, 'pets', [])
    const nextStats = unwrap(statsResponse.data, 'stats', {})
    const nextSummary = unwrap(summaryResponse.data, 'summary', {})
    setPets(nextPets)
    setStats(nextStats)
    setSummary(nextSummary)
    setReports(unwrap(reportResponse.data, 'reports', []))
    setVeterinarians(unwrap(vetResponse.data, 'veterinarians', []))
    await loadNestedCollections(nextPets)
  }

  const loadView = async (page = 1) => {
    if (!aToken) return
    setError('')
    setTableLoading(true)
    try {
      if (view === 'owners') await loadOwners(page)
      if (view === 'pets') {
        await loadPets(page)
        setPets((current) => current.filter((pet) => {
          const gender = !filters.gender || pet.gender === filters.gender
          const status = !filters.vaccinationStatus || pet.vaccinationStatus === filters.vaccinationStatus
          return gender && status
        }))
      }
      if (view === 'veterinarians') await loadVeterinarians(page)
      if (view === 'reports') await loadReports(page)
      if (view === 'vaccinations' || view === 'records') {
        const nextPets = await loadPets(1, 100)
        const nested = await loadNestedCollections(nextPets)
        setPagination({ page: 1, pages: 1, total: view === 'vaccinations' ? nested.vaccinations.length : nested.records.length })
      }
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || 'Veterinary admin records are temporarily unavailable.')
      }
    } finally {
      setTableLoading(false)
    }
  }

  useEffect(() => {
    if (!aToken) return
    setLoading(true)
    loadDashboard()
      .then(() => loadView(1))
      .catch((requestError) => {
        if (!isAuthSessionHandledError(requestError)) setError(requestError.response?.data?.message || 'Veterinary admin dashboard is temporarily unavailable.')
      })
      .finally(() => setLoading(false))
  }, [aToken, view])

  const submitSearch = async (event) => {
    event.preventDefault()
    await loadView(1)
  }

  const dashboardStats = {
    totalPetOwners: stats.totalPetOwners ?? 0,
    totalPets: stats.totalPets ?? pets.length,
    totalVeterinarians: stats.totalVeterinarians ?? veterinarians.length,
    totalVaccinations: stats.totalVaccinations ?? vaccinations.length,
    totalMedicalRecords: records.length || asArray(stats.recentMedicalRecords).length,
    totalAiReports: stats.totalAiReports ?? reports.length,
    upcomingVaccinations: asArray(summary?.recentVaccinations).filter((item) => !item.completedDate).length,
    recentMedicalRecords: asArray(stats.recentMedicalRecords).length
  }

  const analytics = useMemo(() => ({
    monthlyRegistrations: countBy(pets, (pet) => monthKey(pet.createdAt)),
    vaccinationStats: countBy(vaccinations, (item) => item.completedDate ? 'Completed' : new Date(item.dueDate) < new Date() ? 'Overdue' : 'Upcoming'),
    medicalRecordStats: countBy(records, (item) => monthKey(item.visitDate || item.createdAt)),
    aiReportStats: countBy(reports, (item) => item.severity || 'Unknown'),
    veterinarianActivity: countBy(records, (item) => String(item.veterinarianId || 'Unassigned'))
  }), [pets, vaccinations, records, reports])

  if (!aToken || loading) return <Skeleton />
  if (error) return <main className='portal-page'><div className='portal-card mx-auto max-w-2xl p-10 text-center'><p className='portal-eyebrow'>Veterinary administration</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Unable to load veterinary admin records</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button className='portal-button mt-6' onClick={() => loadView(1)}>Try again</button></div></main>

  const ownerColumns = [
    { key: 'phone', label: 'Phone' },
    { key: 'emergencyContact', label: 'Emergency contact' },
    { key: 'emergencyPhone', label: 'Emergency phone' },
    { key: 'address', label: 'Address', render: (owner) => [owner.address?.line1, owner.address?.line2].filter(Boolean).join(', ') || 'Not recorded' }
  ]
  const petColumns = [
    { key: 'name', label: 'Pet name' },
    { key: 'species', label: 'Species' },
    { key: 'breed', label: 'Breed' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age', render: (pet) => pet.age ?? 'Not recorded' },
    { key: 'vaccinationStatus', label: 'Vaccination status' }
  ]
  const vetColumns = [
    { key: 'clinicName', label: 'Veterinary clinic' },
    { key: 'specialization', label: 'Specialization', render: (vet) => listText(vet.specialization) || 'Not recorded' },
    { key: 'yearsOfExperience', label: 'Experience', render: (vet) => `${vet.yearsOfExperience ?? 0} years` },
    { key: 'licenseNumber', label: 'License' },
    { key: 'consultationFee', label: 'Fee' }
  ]
  const vaccinationColumns = [
    { key: 'vaccineName', label: 'Vaccine' },
    { key: 'dueDate', label: 'Due date', render: (item) => formatDate(item.dueDate) },
    { key: 'completedDate', label: 'Completed', render: (item) => formatDate(item.completedDate) },
    { key: 'nextDose', label: 'Next dose', render: (item) => formatDate(item.nextDose) },
    { key: 'notes', label: 'Notes' }
  ]
  const recordColumns = [
    { key: 'visitDate', label: 'Visit date', render: (record) => formatDate(record.visitDate) },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'symptoms', label: 'Symptoms', render: (record) => listText(record.symptoms) || 'Not recorded' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'followUpDate', label: 'Follow-up', render: (record) => formatDate(record.followUpDate) }
  ]
  const reportColumns = [
    { key: 'generatedAt', label: 'Generated', render: (report) => formatDate(report.generatedAt || report.createdAt) },
    { key: 'severity', label: 'Severity', render: (report) => <span className='portal-status bg-amber-50 text-amber-800'>{report.severity || 'unknown'}</span> },
    { key: 'symptoms', label: 'Symptoms', render: (report) => listText(report.symptoms) || 'Not recorded' },
    { key: 'possibleConditions', label: 'Possible conditions', render: (report) => listText(report.possibleConditions) || 'Not recorded' },
    { key: 'aiSummary', label: 'AI summary' }
  ]

  return (
    <main className='portal-page'>
      <section className='flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
        <div><p className='portal-eyebrow'>{title[0]}</p><h1 className='portal-title'>{title[1]}</h1><p className='mt-2 max-w-3xl text-slate-600'>{title[2]}</p></div>
        <div className='flex flex-wrap gap-2'>
          <button className='portal-button-secondary' onClick={() => navigate('/veterinary-analytics')} type='button'>Analytics</button>
          <button className='portal-button' onClick={() => navigate('/veterinary-pets')} type='button'>Manage pets</button>
        </div>
      </section>

      {view === 'dashboard' && (
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard label='Total Pet Owners' value={dashboardStats.totalPetOwners} detail='Registered owner profiles' />
            <StatCard label='Total Pets' value={dashboardStats.totalPets} detail='Veterinary pet profiles' />
            <StatCard label='Total Veterinarians' value={dashboardStats.totalVeterinarians} detail='Veterinarian profiles' />
            <StatCard label='Total Vaccinations' value={dashboardStats.totalVaccinations} detail='Vaccination records' />
            <StatCard label='Total Medical Records' value={dashboardStats.totalMedicalRecords} detail='Loaded pet medical records' />
            <StatCard label='Total AI Reports' value={dashboardStats.totalAiReports} detail='Preliminary AI assessments' />
            <StatCard label='Upcoming Vaccinations' value={dashboardStats.upcomingVaccinations} detail='Pending vaccinations in summary' />
            <StatCard label='Recent Medical Records' value={dashboardStats.recentMedicalRecords} detail='Recent record activity' />
          </div>
          <div className='grid gap-5 xl:grid-cols-2'>
            <section><h2 className='mb-3 text-xl font-semibold text-ink'>Upcoming vaccinations</h2><DataTable columns={vaccinationColumns.slice(0, 4)} rows={asArray(summary?.recentVaccinations)} emptyTitle='No upcoming vaccination records found.' /></section>
            <section><h2 className='mb-3 text-xl font-semibold text-ink'>Recent medical records</h2><DataTable columns={recordColumns.slice(0, 4)} rows={asArray(stats.recentMedicalRecords)} emptyTitle='No recent pet medical records found.' /></section>
          </div>
        </div>
      )}

      {view === 'owners' && <div className='space-y-4'><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='owners' /><DataTable columns={ownerColumns} rows={petOwners} loading={tableLoading} emptyTitle='No pet owners match this search.' /><Pagination pagination={pagination} onPage={loadView} /></div>}
      {view === 'pets' && <div className='space-y-4'><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='pets' /><DataTable columns={petColumns} rows={pets} loading={tableLoading} emptyTitle='No pets match these filters.' /><Pagination pagination={pagination} onPage={loadView} /></div>}
      {view === 'veterinarians' && <div className='space-y-4'><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='veterinarians' /><DataTable columns={vetColumns} rows={veterinarians} loading={tableLoading} emptyTitle='No veterinarians match these filters.' /><Pagination pagination={pagination} onPage={loadView} /></div>}
      {view === 'vaccinations' && <div className='space-y-4'><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='vaccinations' /><DataTable columns={vaccinationColumns} rows={vaccinations} loading={tableLoading} emptyTitle='No vaccination records found.' /></div>}
      {view === 'records' && <div className='space-y-4'><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='records' /><DataTable columns={recordColumns} rows={records} loading={tableLoading} emptyTitle='No pet medical records found.' /></div>}
      {view === 'reports' && <div className='space-y-4'><p className='rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800'>This AI Report is a Preliminary Assessment and must not be considered a diagnosis.</p><Filters filters={filters} setFilters={setFilters} onSearch={submitSearch} mode='reports' /><DataTable columns={reportColumns} rows={reports} loading={tableLoading} emptyTitle='No AI reports match this search.' /><Pagination pagination={pagination} onPage={loadView} /></div>}
      {view === 'analytics' && <div className='grid gap-5 xl:grid-cols-2'><ChartCard title='Monthly Pet Registrations' items={analytics.monthlyRegistrations.length ? analytics.monthlyRegistrations : [{ label: 'No data', value: 0 }]} /><ChartCard title='Vaccination Statistics' items={analytics.vaccinationStats.length ? analytics.vaccinationStats : [{ label: 'No data', value: 0 }]} /><ChartCard title='Medical Record Statistics' items={analytics.medicalRecordStats.length ? analytics.medicalRecordStats : [{ label: 'No data', value: 0 }]} /><ChartCard title='AI Report Statistics' items={analytics.aiReportStats.length ? analytics.aiReportStats : [{ label: 'No data', value: 0 }]} /><ChartCard title='Veterinarian Activity' items={analytics.veterinarianActivity.length ? analytics.veterinarianActivity : [{ label: 'No data', value: 0 }]} /></div>}
    </main>
  )
}

export default VeterinaryAdminDashboard
