"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  Search,
  SlidersHorizontal,
  CalendarClock,
  BriefcaseMedical,
  Stethoscope,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { AppContext } from '../context/AppContext'
import { useNavigate, useParams } from '../lib/routerCompat'
import { normalizeSpeciality, vetSpecialities, cleanVetText } from '../lib/veterinaryDisplay'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const to12Hour = (time) => {
  if (!time) return ''
  const [hourStr, minuteStr] = String(time).split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr || '00'
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minute} ${suffix}`
}

const nextAvailabilityLabel = (doctor) => {
  const schedule = doctor?.availability?.weeklySchedule
  if (!Array.isArray(schedule) || schedule.length === 0) return null

  const enabled =
    doctor.available !== false && (doctor.availability?.enabled === undefined || doctor.availability.enabled !== false)

  if (!enabled) return { text: 'Currently unavailable', unavailable: true }

  const now = new Date()
  const today = now.getDay()

  for (let offset = 0; offset < 7; offset += 1) {
    const dayOfWeek = (today + offset) % 7
    const daySchedule = schedule.find((item) => item.dayOfWeek === dayOfWeek)
    if (daySchedule && Array.isArray(daySchedule.slots) && daySchedule.slots.length > 0) {
      const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAYS[dayOfWeek]
      return { text: `${label}, ${to12Hour(daySchedule.slots[0])}`, unavailable: false }
    }
  }

  return { text: 'Next week', unavailable: false }
}

const Doctors = () => {
  const { speciality } = useParams()
  const navigate = useNavigate()

  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  const { doctors, doctorsLoading, doctorsError, getDoctosData, currencySymbol } = useContext(AppContext)

  const applyFilter = useMemo(() => {
    const normalizedSelected = speciality ? normalizeSpeciality(speciality) : ''

    const query = searchTerm.trim().toLowerCase()

    return doctors.filter((doc) => {
      if (normalizedSelected && normalizeSpeciality(doc.speciality) !== normalizedSelected) return false

      if (availableOnly && doc.available !== true) return false

      if (query) {
        const clinic = cleanVetText(doc.clinicName || '').toLowerCase()
        const addressLine = cleanVetText(`${doc.address?.line1 || ''} ${doc.address?.line2 || ''}`).toLowerCase()
        const haystack = `${doc.name} ${doc.speciality} ${clinic} ${addressLine}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [doctors, speciality, searchTerm, availableOnly])

  useEffect(() => {
    setFilterDoc(applyFilter)
  }, [applyFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setAvailableOnly(false)
    if (speciality) navigate('/doctors')
  }

  const hasActiveFilters = Boolean(searchTerm.trim()) || availableOnly || Boolean(speciality)

  const SkeletonCard = () => (
    <div className="overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-soft animate-pulse">
      <div className="h-[200px] w-full bg-[#E7F4F5]" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded-full bg-[#E7F4F5]" />
        <div className="h-5 w-3/4 rounded-lg bg-[#E7F4F5]" />
        <div className="h-3 w-1/2 rounded-full bg-[#E7F4F5]" />
        <div className="h-12 w-full rounded-xl bg-[#E7F4F5]" />
      </div>
    </div>
  )

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-10">
        <p className="mf-eyebrow">Find the right veterinarian</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-[42px] sm:leading-[1.15]">
          Browse veterinarians
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
          Filter by clinical department and choose a time that works for you and your pet.
        </p>
      </div>

      {/* Search / Filter bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search veterinarian, specialty, clinic..."
            className="h-[52px] w-full rounded-2xl border border-line bg-white pl-12 pr-10 text-sm font-medium text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-mist hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAvailableOnly((value) => !value)}
          className={`inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition ${
            availableOnly
              ? 'border-primary/30 bg-mist text-primary'
              : 'border-line bg-white text-ink shadow-sm hover:bg-mist'
          }`}
        >
          <CheckCircle2 className={`h-4 w-4 ${availableOnly ? 'text-primary' : 'text-slate-400'}`} />
          Available Now
        </button>

        <button
          type="button"
          onClick={() => setShowFilter(!showFilter)}
          className={`inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition lg:hidden ${
            showFilter ? 'border-primary/30 bg-mist text-primary' : 'border-line bg-white text-ink shadow-sm hover:bg-mist'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Specialty filter panel */}
        <aside
          className={`w-full shrink-0 flex-col gap-1.5 rounded-[20px] border border-line/70 bg-white p-5 shadow-soft lg:sticky lg:top-24 lg:flex lg:w-[240px] xl:w-[260px] ${
            showFilter ? 'flex' : 'hidden'
          }`}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Clinical Department</p>
            <Stethoscope className="h-4 w-4 text-primary" />
          </div>
          <button
            type="button"
            onClick={() => {
              navigate('/doctors')
              setShowFilter(false)
            }}
            className={`rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
              !speciality ? 'bg-[#E7F4F5] text-primary' : 'text-muted hover:bg-mist hover:text-ink'
            }`}
          >
            All Departments
          </button>
          {vetSpecialities.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                if (normalizeSpeciality(speciality) === normalizeSpeciality(item)) {
                  navigate('/doctors')
                } else {
                  navigate(`/doctors/${item}`)
                }
                setShowFilter(false)
              }}
              className={`rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                normalizeSpeciality(speciality) === normalizeSpeciality(item)
                  ? 'bg-[#E7F4F5] text-primary'
                  : 'text-muted hover:bg-mist hover:text-ink'
              }`}
            >
              {item}
            </button>
          ))}
        </aside>

        {/* Doctor grid */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {doctorsLoading && Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}

          {!doctorsLoading && doctorsError && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[20px] border border-line/70 bg-white px-6 py-16 text-center shadow-soft">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                <BriefcaseMedical className="h-7 w-7" />
              </span>
              <p className="mt-5 text-xl font-extrabold text-ink">Unable to load veterinarians</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                We could not reach the veterinary directory. Please try again in a moment.
              </p>
              <button type="button" onClick={getDoctosData} className="mf-button mt-6">
                Retry
              </button>
            </div>
          )}

          {!doctorsLoading && !doctorsError && filterDoc.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[20px] border border-line/70 bg-white px-6 py-16 text-center shadow-soft">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist text-primary">
                <Search className="h-7 w-7" />
              </span>
              <p className="mt-5 text-xl font-extrabold text-ink">No veterinarians found</p>
              <p className="mt-2 text-sm leading-6 text-muted">Try adjusting your search or filters.</p>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="mf-button-secondary mt-6">
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {!doctorsLoading &&
            !doctorsError &&
            filterDoc.map((item, index) => {
              const availability = nextAvailabilityLabel(item)
              const location = cleanVetText(`${item.address?.line1 || ''} ${item.address?.line2 || ''}`)

              return (
                <article
                  key={index}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
                >
                  {/* Image */}
                  <div className="relative h-[200px] w-full shrink-0 overflow-hidden bg-[#E7F4F5]">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                    {/* Availability badge */}
                    <span
                      className={`absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-soft backdrop-blur-md ${
                        item.available
                          ? 'bg-emerald-500/95 text-white'
                          : 'bg-slate-700/90 text-white'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${item.available ? 'bg-white' : 'bg-slate-300'}`}
                      />
                      {item.available ? 'Available to book' : 'Unavailable'}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-[20px] font-bold leading-snug tracking-tight text-ink">
                      {item.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-primary">{item.speciality}</p>

                    {/* Speciality chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-primary">
                        {item.degree || 'DVM'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        <BriefcaseMedical className="h-3 w-3" />
                        {item.experience}
                      </span>
                    </div>

                    {/* Clinic / location */}
                    <div className="mt-4 space-y-1.5 border-t border-line/60 pt-4 text-sm text-muted">
                      {item.clinicName && (
                        <p className="flex items-center gap-2 font-semibold text-ink">
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                          <span className="line-clamp-1">{item.clinicName}</span>
                        </p>
                      )}
                      {location && (
                        <p className="flex items-center gap-2 pl-6">
                          <span className="line-clamp-1">{location}</span>
                        </p>
                      )}
                    </div>

                    {/* Fee + availability */}
                    <div className="mt-4 grid grid-cols-2 items-center gap-3 rounded-xl bg-[#F6F9F9] px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Consultation</p>
                        <p className="mt-0.5 text-sm font-extrabold text-ink">
                          {currencySymbol}
                          {item.fees}
                        </p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Next available</p>
                        <p
                          className={`mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold ${
                            availability?.unavailable ? 'text-slate-500' : 'text-primary'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{availability?.text || '—'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Book */}
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/appointment/${item._id}`)
                        scrollTo(0, 0)
                      }}
                      className="mt-4 inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-soft-lg transition-all duration-200 hover:bg-primary-dark hover:shadow-soft-xl disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!item.available}
                    >
                      <CalendarClock className="h-4 w-4" />
                      {item.available ? 'Book Appointment' : 'Currently Unavailable'}
                    </button>
                  </div>
                </article>
              )
            })}
        </div>
      </div>
    </section>
  )
}

export default Doctors