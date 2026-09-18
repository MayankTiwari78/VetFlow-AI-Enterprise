import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Calendar,
  CalendarClock,
  ClipboardList,
  FileText,
  Filter,
  HeartPulse,
  Paperclip,
  PawPrint,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
  Brain
} from 'lucide-react'
import { reviewStatusLabel, reviewBadgeClass } from './reportUtils'

const asArray = (items) => (Array.isArray(items) ? items : [])

// Unified timeline record kinds
const KIND = {
  MEDICAL_RECORD: 'medical-record',
  VACCINATION: 'vaccination',
  AI_REPORT: 'ai-report'
}

// Category labels for filter dropdown (combines visit types + vaccination categories + AI modalities)
const ALL_VISIT_TYPES = [
  'All visit types',
  'Medical Visit',
  'Wellness Check',
  'Vaccination',
  'Dental Care',
  'Surgery',
  'Follow-up'
]

const ALL_VACCINATION_CATEGORIES = [
  'Core',
  'Non-Core',
  'Bordetella',
  'Rabies',
  'Leptospirosis',
  'Heartworm',
  'Parasite Prevention'
]

const ALL_AI_MODALITIES = [
  'Symptom',
  'Image',
  'Combined'
]

const buildVisitTypeOptions = () => {
  return [...ALL_VISIT_TYPES]
}

const formatDate = (value, includeYear = true) => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const options = includeYear
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric' }
  return date.toLocaleDateString(undefined, options)
}

const shortDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const yearFor = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recent' : String(date.getFullYear())
}

const visitYear = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : String(date.getFullYear())
}

const listText = (items) => asArray(items).join(', ')

const getInitial = (name) => String(name || 'P').charAt(0).toUpperCase()

const deriveVisitType = (record) => {
  const diagnosis = String(record?.diagnosis || '').toLowerCase()
  const treatment = String(record?.treatment || '').toLowerCase()
  if (/(vaccin|booster|fvrcp|fehv|fiv|rabies|dhpp)/.test(diagnosis + treatment)) return 'Vaccination'
  if (/(wellness|routine|physical examination|check-?up|puppy wellness|growth assessment)/.test(diagnosis + treatment)) return 'Wellness Check'
  if (/(dent(al|istry)|scaling|polishing|gingivitis)/.test(diagnosis + treatment)) return 'Dental Care'
  if (/(surgery|tplo|osteotomy|procedure)/.test(diagnosis + treatment)) return 'Surgery'
  if (/(follow-?up|recheck|review|monitor)/.test(diagnosis + treatment)) return 'Follow-up'
  return 'Medical Visit'
}

// Vaccination category helper
const vaccinationCategory = (vaccination) =>
  String(vaccination?.category || 'Core').replace(/-/g, ' ')

// AI report modality helper
const aiReportModality = (report) => {
  const modality = String(report?.modality || 'symptom')
  if (modality === 'combined') return 'Combined'
  if (modality === 'image') return 'Image'
  return 'Symptom'
}

// Record date helper - works across all record types
const recordDate = (record, kind) => {
  if (kind === KIND.VACCINATION) {
    // For vaccinations, use completedDate if available, otherwise dueDate
    if (record.completedDate) return new Date(record.completedDate)
    if (record.dueDate) return new Date(record.dueDate)
    return new Date()
  }
  if (kind === KIND.AI_REPORT) {
    // For AI reports, use generatedAt or createdAt
    if (record.generatedAt) return new Date(record.generatedAt)
    if (record.createdAt) return new Date(record.createdAt)
    return new Date()
  }
  // Medical record: use visitDate
  if (record.visitDate) return new Date(record.visitDate)
  return new Date()
}

// Safe date formatter for any record kind
const formatRecordDate = (record, kind, includeYear = true) => {
  const dateValue = recordDate(record, kind)
  if (!dateValue || isNaN(dateValue.getTime())) return 'Not scheduled'
  const options = includeYear
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric' }
  return dateValue.toLocaleDateString(undefined, options)
}

const PetImage = ({ src, alt, className, fallbackClassName }) => {
  const [imgError, setImgError] = useState(false)
  if (src && !imgError) {
    return <img src={src} alt={alt} onError={() => setImgError(true)} className={className} />
  }
  return (
    <div className={`${className} grid place-items-center font-bold ${fallbackClassName || 'bg-teal/10 text-teal'}`}>
      {getInitial(alt)}
    </div>
  )
}

const SummaryItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-xl bg-[#F6F9F9] p-3">
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-ink">{value}</p>
    </div>
  </div>
)

const PetHealthSummary = ({ pet, records }) => {
  if (!pet) return null
  const hasRecords = records.length > 0
  const isHealthy =
    String(pet.vaccinationStatus || '').toLowerCase() === 'up-to-date' ||
    String(pet.vaccinationStatus || '').toLowerCase() === 'healthy' ||
    String(pet.vaccinationStatus || '').toLowerCase() === 'good'
  const isAttention =
    String(pet.vaccinationStatus || '').toLowerCase() === 'needs attention' ||
    String(pet.vaccinationStatus || '').toLowerCase() === 'overdue' ||
    String(pet.vaccinationStatus || '').toLowerCase() === 'due' ||
    String(pet.vaccinationStatus || '').toLowerCase() === 'attention'
  const healthLabel = isHealthy ? 'Healthy' : isAttention ? 'Needs attention' : pet.vaccinationStatus || 'Unknown'
  const healthTone = isHealthy ? 'bg-emerald-50 text-emerald-700' : isAttention ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  const lastVisit = hasRecords ? formatRecordDate(records[0], records[0].kind || KIND.MEDICAL_RECORD) : 'Not scheduled'
  const ageValue = pet.age ? `${pet.age} ${Number(pet.age) === 1 ? 'year' : 'years'}` : 'Age not set'
  const breedValue = pet.breed || pet.species || 'Breed not set'
  const weightValue = pet.weight ? `${pet.weight} kg` : null

  return (
    <section className="rounded-[20px] border border-line/70 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <PetImage
            src={pet.profileImage}
            alt={pet.name}
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            fallbackClassName="h-16 w-16 shrink-0 rounded-2xl bg-teal/10 text-xl text-teal"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate text-xl font-extrabold text-ink">{pet.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${healthTone}`}>{healthLabel}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {[breedValue, ageValue, weightValue].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-teal">
              {hasRecords ? `${records.length} medical ${records.length === 1 ? 'record' : 'records'} on file` : 'No medical records yet'}
            </p>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 md:min-w-[320px] md:flex-1">
          <SummaryItem icon={HeartPulse} label="Health status" value={healthLabel} />
          <SummaryItem icon={Calendar} label="Last visit" value={lastVisit} />
        </div>
      </div>
    </section>
  )
}

const ToolbarField = ({ children }) => (
  <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 transition-colors focus-within:border-teal/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal/10">
    {children}
  </div>
)

const MedicalHistoryToolbar = ({ records, vaccinations, reports, pets, filters, setFilters, onReset, visitTypeOptions, petOptions }) => {

  const handleChange = (patch) => setFilters((prev) => ({ ...prev, ...patch }))

  return (
    <section className="rounded-[20px] border border-line/70 bg-white p-4 shadow-soft sm:p-5">
      <div className="grid w-full min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <ToolbarField>
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400"
            placeholder="Search diagnosis, symptoms, or treatment…"
            value={filters.search}
            onChange={(event) => handleChange({ search: event.target.value })}
          />
        </ToolbarField>

        <ToolbarField>
          <PawPrint className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            className="w-full min-w-0 cursor-pointer bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none"
            value={filters.petId || ''}
            onChange={(event) => handleChange({ petId: event.target.value })}
          >
            <option value="">All pets</option>
            {petOptions.map((pet) => (
              <option key={pet.id} value={pet.id}>{pet.name}</option>
            ))}
          </select>
        </ToolbarField>

        <ToolbarField>
          <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            className="w-full min-w-0 cursor-pointer bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none"
            value={filters.visitType}
            onChange={(event) => handleChange({ visitType: event.target.value })}
          >
            {visitTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </ToolbarField>

        <ToolbarField>
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="date"
            className="w-full min-w-0 cursor-pointer bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none"
            value={filters.fromDate || ''}
            onChange={(event) => handleChange({ fromDate: event.target.value })}
            aria-label="From date"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            className="w-full min-w-0 cursor-pointer bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none"
            value={filters.toDate || ''}
            onChange={(event) => handleChange({ toDate: event.target.value })}
            aria-label="To date"
          />
        </ToolbarField>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-sm font-bold text-muted transition-all duration-200 hover:border-teal/40 hover:bg-mist hover:text-teal"
        >
          <Filter className="h-4 w-4" />
          Reset
        </button>
      </div>
    </section>
  )
}

const SectionGrid = ({ icon: Icon, title, children, emptyText }) => (
  <div className="overflow-hidden rounded-xl border border-line/70 bg-[#F6F9F9]">
    <div className="flex items-center gap-2 border-b border-line/70 bg-white/70 px-4 py-2.5">
      <Icon className="h-3.5 w-3.5 text-teal" strokeWidth={2.2} />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
    </div>
    <div className="px-4 py-3 text-sm leading-6 text-slate-700">
      {children || <span className="text-slate-400">{emptyText}</span>}
    </div>
  </div>
)

const MedicationList = ({ title, icon: Icon, items, nameKey, tone }) => (
  <div className="rounded-xl border border-line/70 bg-white">
    <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
      <Icon className="h-3.5 w-3.5 text-teal" strokeWidth={2.2} />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
    </div>
    <ul className="divide-y divide-line/70">
      {items.map((item, index) => (
        <li key={`${nameKey}-${index}`} className="px-4 py-2.5 text-sm">
          <p className="font-semibold text-ink">{item.name || item.medicationName}</p>
          <p className={`mt-0.5 text-xs ${tone}`}>
            {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
          </p>
          {item.instructions && <p className="mt-1 text-xs leading-5 text-slate-500">{item.instructions}</p>}
        </li>
      ))}
    </ul>
  </div>
)

const MedicalRecordCard = ({ record }) => {
  const [expanded, setExpanded] = useState(false)
  const symptoms = listText(record.symptoms)
  const medications = asArray(record.medications)
  const prescriptions = asArray(record.prescriptions)
  const labReports = asArray(record.laboratoryReports)
  const attachments = asArray(record.attachments)
  const hasMedications = medications.length > 0 || prescriptions.length > 0
  const hasLabs = labReports.length > 0
  const hasAttachments = attachments.length > 0

  return (
    <article className="group overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-card-hover">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-teal">
            <Stethoscope className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-bold text-teal">
              {deriveVisitType(record)}
            </span>
            <h3 className="mt-1.5 truncate text-base font-extrabold text-ink">{record.diagnosis || 'Medical visit'}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-bold text-muted">{formatDate(record.visitDate)}</p>
        </div>
      </div>

      {/* Clinician row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <UserRound className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-ink">MedFlow Veterinary Team</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-slate-400" />
          <span className="text-muted">MedFlow Vet Clinic</span>
        </div>
        {record.followUpDate && (
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-teal" />
            <span className="font-semibold text-teal">Follow-up {formatDate(record.followUpDate)}</span>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid gap-3 px-5 pb-1 sm:px-6 lg:grid-cols-2">
        <SectionGrid icon={ClipboardList} title="Diagnosis" emptyText="Not recorded" children={record.diagnosis} />
        <SectionGrid icon={Activity} title="Symptoms" emptyText="Not recorded" children={symptoms} />
        <SectionGrid
          icon={Pill}
          title="Treatment"
          emptyText="Not recorded"
          children={record.treatment}
        />
        <SectionGrid
          icon={ShieldCheck}
          title="Follow-up"
          emptyText="Not scheduled"
          children={record.followUpDate ? formatDate(record.followUpDate) : 'Not scheduled'}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-2">
          {hasMedications && (
            <>
              {medications.length > 0 && (
                <MedicationList
                  title="Medications"
                  icon={Pill}
                  items={medications}
                  nameKey="med"
                  tone="text-slate-600"
                />
              )}
              {prescriptions.length > 0 && (
                <MedicationList
                  title="Prescriptions"
                  icon={ClipboardList}
                  items={prescriptions}
                  nameKey="rx"
                  tone="text-teal"
                />
              )}
            </>
          )}
          {hasLabs && (
            <div className="rounded-xl border border-line/70 bg-white lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
                <FileText className="h-3.5 w-3.5 text-teal" strokeWidth={2.2} />
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Laboratory reports</p>
              </div>
              <ul className="divide-y divide-line/70">
                {labReports.map((report, index) => (
                  <li key={`lab-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{report.title}</p>
                      {report.result && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{report.result}</p>}
                    </div>
                    {report.fileUrl && (
                      <a href={report.fileUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-teal hover:bg-mist">
                        View report
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal transition-colors hover:text-teal/80"
        >
          {expanded ? 'Show less' : 'View details'}
          <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>
        {hasAttachments && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-teal">
            <Paperclip className="h-3.5 w-3.5" />
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </article>
  )
}

const VaccinationCard = ({ record }) => {
  const status = record.status || 'up-to-date'
  const STATUS_TONE = {
    'up-to-date': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'due-soon': 'bg-amber-50 text-amber-700 border-amber-200',
    'overdue': 'bg-rose-50 text-rose-700 border-rose-200',
    'completed': 'bg-slate-50 text-slate-600 border-slate-200',
    'cancelled': 'bg-slate-50 text-slate-600 border-slate-200'
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200'

  const STATUS_LABEL = {
    'up-to-date': 'Up to Date',
    'due-soon': 'Due Soon',
    'overdue': 'Overdue',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }[status] || status

  return (
    <article className="group overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-card-hover">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Syringe className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              {vaccinationCategory(record)}
            </span>
            <h3 className="mt-1.5 truncate text-base font-extrabold text-ink">{record.vaccineName || 'Vaccination'}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-bold text-muted">{formatRecordDate(record, KIND.VACCINATION)}</p>
        </div>
      </div>

      {/* Status & details row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE}`}>
            {STATUS_LABEL}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span className="text-muted">
            {record.completedDate
              ? `Administered ${formatRecordDate(record, KIND.VACCINATION)}`
              : record.dueDate
                ? `Due ${formatRecordDate(record, KIND.VACCINATION)}`
                : 'Date not set'}
          </span>
        </div>
        {record.nextDose && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-teal" />
            <span className="font-semibold text-teal">Next due {formatRecordDate(record, KIND.VACCINATION, false)}</span>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid gap-3 px-5 pb-1 sm:px-6 lg:grid-cols-2">
        <SectionGrid icon={ShieldCheck} title="Category" emptyText="Not set" children={record.category || 'Core'} />
        <SectionGrid icon={UserRound} title="Veterinarian" emptyText="Not recorded" children={record.veterinarian ? 'Veterinary team' : 'Not assigned'} />
        <SectionGrid icon={ClipboardList} title="Clinic" emptyText="Not recorded" children={record.clinic || 'Not recorded'} />
        <SectionGrid icon={Pill} title="Dose / Route" emptyText="Not recorded" children={
          [record.dose, record.route].filter(Boolean).join(' · ') || 'Not recorded'
        } />
        {record.manufacturer && (
          <SectionGrid icon={Activity} title="Manufacturer" emptyText="Not recorded" children={record.manufacturer} />
        )}
        {record.batchNumber && (
          <SectionGrid icon={FileText} title="Batch" emptyText="Not recorded" children={record.batchNumber} />
        )}
      </div>

      {/* Notes */}
      {record.notes && (
        <div className="grid gap-3 px-5 py-4 sm:px-6">
          <SectionGrid icon={ClipboardList} title="Notes" emptyText="No notes" children={record.notes} />
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 sm:px-6">
        <p className="text-xs font-semibold text-muted">
          Vaccination record — administered by veterinary care team
        </p>
        {record.nextDose && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal">
            <Calendar className="h-3.5 w-3.5" />
            Next dose: {formatRecordDate(record, KIND.VACCINATION, false)}
          </span>
        )}
      </div>
    </article>
  )
}

const AiReportCard = ({ record }) => {
  const [expanded, setExpanded] = useState(false)
  const hasSymptoms = asArray(record.symptoms).length > 0
  const hasConditions = asArray(record.possibleConditions).length > 0
  const hasImages = asArray(record.uploadedImages).length > 0
  const modality = aiReportModality(record)
  const reviewStatus = record.veterinarianReviewStatus || 'pending'
  const reviewLabel = reviewStatusLabel(reviewStatus)

  const reportDate = formatRecordDate(record, KIND.AI_REPORT)
  const findingsText = asArray(record.possibleConditions).join(', ') || 'No conditions identified'

  return (
    <article className="group overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-card-hover">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Brain className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
              {modality} AI Report
            </span>
            <h3 className="mt-1.5 truncate text-base font-extrabold text-ink">
              {record.aiSummary ? String(record.aiSummary).slice(0, 80) + (String(record.aiSummary).length > 80 ? '…' : '') : 'AI Preliminary Assessment'}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-violet-600">
              {findingsText}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-bold text-muted">{reportDate}</p>
        </div>
      </div>

      {/* AI summary */}
      {record.aiSummary && (
        <div className="px-5 py-3.5 sm:px-6">
          <p className="text-sm leading-6 text-slate-700">{record.aiSummary}</p>
        </div>
      )}

      {/* Clinical warning */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        <p className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>This is a preliminary AI assessment, not a veterinary diagnosis. Veterinarian review is required before any treatment decision.</span>
        </p>
      </div>

      {/* Symptoms */}
      {hasSymptoms && (
        <div className="px-5 py-3.5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Symptoms assessed</p>
          <p className="mt-1 text-sm text-slate-700">{listText(record.symptoms)}</p>
        </div>
      )}

      {/* Findings / possible conditions */}
      {hasConditions && (
        <div className="px-5 py-3.5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">AI findings — possible conditions</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {asArray(record.possibleConditions).map((condition, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{String(condition).replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Severity */}
      <div className="px-5 py-3.5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">AI severity assessment</p>
        <p className="mt-1 text-sm font-semibold text-ink">
          {String(record.severity || '').charAt(0).toUpperCase() + String(record.severity || '').slice(1) || 'Not assessed'}
        </p>
      </div>

      {/* Evidence / image reference */}
      {hasImages && (
        <div className="px-5 py-3.5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Supporting image evidence</p>
          <p className="mt-1 text-xs text-slate-500">
            {asArray(record.uploadedImages).length} image{asArray(record.uploadedImages).length === 1 ? '' : 's'} used by the Combined AI Assessment. Input used by the AI, not a standalone medical report.
          </p>
        </div>
      )}

      {/* Veterinarian review status */}
      <div className="px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${reviewBadgeClass(reviewStatus)}`}>
            {reviewLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          AI model: {record.modelVersion || 'vetflow-ml-v1.1.0-dev'} · Contract: {record.contractVersion || '1.0.0'}
        </p>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-2">
          {hasConditions && (
            <div className="rounded-xl border border-line/70 bg-white lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
                <Brain className="h-3.5 w-3.5 text-teal" strokeWidth={2.2} />
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">All possible conditions</p>
              </div>
              <ul className="divide-y divide-line/70">
                {asArray(record.possibleConditions).map((condition, i) => (
                  <li key={i} className="px-4 py-2.5 text-sm">
                    <span className="font-semibold text-ink">{String(condition).replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {record.recommendations && asArray(record.recommendations).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">AI recommendations</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {asArray(record.recommendations).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    {String(rec)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {record.veterinarianReview && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Veterinarian review</p>
              {(record.veterinarianReview.finalAssessment?.condition) && (
                <p className="mt-1 text-sm font-semibold text-ink">
                  Vet final assessment: {record.veterinarianReview.finalAssessment.condition}
                </p>
              )}
              {(record.veterinarianReview.finalAssessment?.diagnosis) && (
                <p className="mt-0.5 text-sm text-slate-600">
                  Vet diagnosis: {record.veterinarianReview.finalAssessment.diagnosis}
                </p>
              )}
              {(record.veterinarianReview.notes) && (
                <p className="mt-1 text-sm text-slate-600">{record.veterinarianReview.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal transition-colors hover:text-teal/80"
        >
          {expanded ? 'Show less' : 'View details'}
          <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <p className="text-xs text-muted">
          Report ID: {record._id || '—'} · Generated {reportDate}
        </p>
      </div>
    </article>
  )
}

const YearMarker = ({ label, isLast }) => (
  <div className="flex items-center gap-3">
    <div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-teal/25 bg-white text-teal">
      <CalendarClock className="h-4 w-4" strokeWidth={2.2} />
    </div>
    <p className="text-lg font-extrabold text-ink">{label}</p>
    {!isLast && <div className="ml-2 hidden h-px flex-1 bg-line/70 sm:block" />}
  </div>
)

const TimelineItem = ({ record }) => {
  const year = yearFor(record._date)
  const dateLabel = shortDate(record._date)
  const day = record._date
  const dayNum = Number.isNaN(day.getTime()) ? '' : String(day.getDate()).padStart(2, '0')

  const renderCard = () => {
    if (record.kind === KIND.VACCINATION) return <VaccinationCard record={record} />
    if (record.kind === KIND.AI_REPORT) return <AiReportCard record={record} />
    return <MedicalRecordCard record={record} />
  }

  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Timeline column */}
      <div className="relative flex w-14 shrink-0 flex-col items-center sm:w-20">
        <span className="z-10 grid h-11 w-11 place-items-center rounded-full border-4 border-[#F6F9F9] bg-teal text-xs font-extrabold text-white shadow-soft">
          {dayNum}
        </span>
        <span className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{dateLabel}</span>
        {!record._isLast && <span className="absolute top-12 bottom-0 w-px bg-line" />}
      </div>
      {/* Card */}
      <div className="min-w-0 flex-1 pb-8">
        {renderCard()}
      </div>
    </div>
  )
}

const MedicalTimeline = ({ records }) => {
  const recordsWithMeta = useMemo(() => {
    return records.map((record, index) => ({ ...record, _isLast: index === records.length - 1 }))
  }, [records])

  const groupedByYear = useMemo(() => {
    return recordsWithMeta.reduce((acc, record) => {
      const year = yearFor(record._date)
      if (!acc[year]) acc[year] = []
      acc[year].push(record)
      return acc
    }, {})
  }, [recordsWithMeta])

  const years = Object.keys(groupedByYear)

  return (
    <div className="space-y-8">
      {years.map((year, yearIndex) => (
        <section key={year}>
          <YearMarker label={year} isLast={yearIndex === years.length - 1} />
          <div className="mt-4 space-y-0">
            {groupedByYear[year].map((record) => (
              <TimelineItem key={record._id || record.id} record={record} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const MedicalHistoryEmptyState = ({ onBrowseVets, onRegisterPet }) => (
  <section className="overflow-hidden rounded-[20px] border border-dashed border-teal/30 bg-white p-8 text-center sm:p-12">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mist text-teal">
      <HeartPulse className="h-8 w-8" strokeWidth={1.8} />
    </div>
    <h3 className="mt-5 text-xl font-extrabold text-ink">No medical records yet</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
      Your pet's veterinary visits, diagnoses, treatments, and follow-ups will appear here after their first visit.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button
        type="button"
        onClick={onBrowseVets}
        className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-sm font-bold text-ink transition-all duration-200 hover:border-teal/40 hover:bg-mist hover:text-teal"
      >
        <Stethoscope className="h-4 w-4" />
        Browse veterinarians
      </button>
      <button
        type="button"
        onClick={onRegisterPet}
        className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-teal/90"
      >
        <PawPrint className="h-4 w-4" />
        Register pet
      </button>
    </div>
  </section>
)

const MedicalHistoryHero = ({ onMyPets, onRegisterPet }) => (
  <section className="flex flex-col justify-between gap-6 border-b border-line/70 pb-8 md:flex-row md:items-end">
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-teal">PET HEALTH RECORDS</p>
      <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-[42px]">
        Medical history
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
        A complete timeline of your pet's visits, diagnoses, treatments, medications, and follow-ups.
      </p>
    </div>
    <div className="flex shrink-0 flex-wrap gap-3">
      <button
        type="button"
        onClick={onMyPets}
        className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-sm font-bold text-ink transition-all duration-200 hover:border-teal/40 hover:bg-mist hover:text-teal"
      >
        <PawPrint className="h-4 w-4" />
        My pets
      </button>
      <button
        type="button"
        onClick={onRegisterPet}
        className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-teal/90"
      >
        <Syringe className="h-4 w-4" />
        Register pet
      </button>
    </div>
  </section>
)

const MedicalHistoryPage = ({ pets, records, vaccinations = [], reports = [], onMyPets, onBrowseVets, onRegisterPet }) => {
  const [filters, setFilters] = useState({
    search: '',
    petId: '',
    visitType: 'All visit types',
    fromDate: '',
    toDate: ''
  })

  // Combine all record sources into unified timeline items
  const allTimelineItems = useMemo(() => {
    const items = []
    // Medical records
    asArray(records).forEach((record) => {
      items.push({
        ...record,
        kind: KIND.MEDICAL_RECORD,
        _date: record.visitDate ? new Date(record.visitDate) : new Date()
      })
    })
    // Vaccinations
    asArray(vaccinations).forEach((vaccination) => {
      const dateSource = vaccination.completedDate
        ? new Date(vaccination.completedDate)
        : vaccination.dueDate ? new Date(vaccination.dueDate) : new Date()
      items.push({
        ...vaccination,
        kind: KIND.VACCINATION,
        _date: dateSource
      })
    })
    // AI reports
    asArray(reports).forEach((report) => {
      const dateSource = report.generatedAt
        ? new Date(report.generatedAt)
        : report.createdAt ? new Date(report.createdAt) : new Date()
      items.push({
        ...report,
        kind: KIND.AI_REPORT,
        _date: dateSource
      })
    })
    return items.sort((a, b) => b._date.getTime() - a._date.getTime())
  }, [records, vaccinations, reports])

  const recordedPets = useMemo(() => {
    const ids = new Set()
    asArray(records).forEach((r) => ids.add(String(r.petId || '')))
    asArray(vaccinations).forEach((v) => ids.add(String(v.petId || '')))
    asArray(reports).forEach((r) => ids.add(String(r.petId || '')))
    return asArray(pets).filter((pet) => ids.has(String(pet._id || pet.id)))
  }, [pets, records, vaccinations, reports])

  const primaryPet = recordedPets[0] || asArray(pets)[0] || null

  // Build visit type options from all record types
  const visitTypeOptions = useMemo(() => {
    const types = new Set()
    types.add('All visit types')
    asArray(records).forEach((r) => types.add(deriveVisitType(r)))
    asArray(vaccinations).forEach((v) => types.add(vaccinationCategory(v)))
    asArray(reports).forEach((r) => types.add(aiReportModality(r)))
    return [...types].sort()
  }, [records, vaccinations, reports])

  const petOptions = asArray(pets).map((pet) => ({ id: pet._id || pet.id, name: pet.name }))

  const visibleTimelineItems = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return allTimelineItems.filter((item) => {
      // Pet filter
      if (filters.petId && String(item.petId || '') !== String(filters.petId)) return false

      // Visit type / category filter
      if (filters.visitType && filters.visitType !== 'All visit types') {
        let itemType = ''
        if (item.kind === KIND.MEDICAL_RECORD) {
          itemType = deriveVisitType(item)
        } else if (item.kind === KIND.VACCINATION) {
          itemType = vaccinationCategory(item)
        } else if (item.kind === KIND.AI_REPORT) {
          itemType = aiReportModality(item)
        }
        if (itemType !== filters.visitType) return false
      }

      // Date range filter
      if (filters.fromDate && item._date < new Date(filters.fromDate)) return false
      if (filters.toDate && item._date > new Date(`${filters.toDate}T23:59:59`)) return false

      // Search across all record types
      if (searchTerm) {
        let haystack = ''
        if (item.kind === KIND.MEDICAL_RECORD) {
          haystack = [
            item.diagnosis,
            item.treatment,
            listText(item.symptoms),
            listText(item.medications.map((m) => m.name)),
            listText(item.prescriptions.map((p) => p.medicationName))
          ].join(' ').toLowerCase()
        } else if (item.kind === KIND.VACCINATION) {
          haystack = [
            item.vaccineName,
            item.category,
            item.notes,
            item.clinic
          ].join(' ').toLowerCase()
        } else if (item.kind === KIND.AI_REPORT) {
          haystack = [
            listText(item.symptoms),
            item.aiSummary,
            listText(item.possibleConditions),
            listText(item.recommendations),
            item.modality || ''
          ].join(' ').toLowerCase()
        }
        if (!haystack.includes(searchTerm)) return false
      }

      return true
    })
  }, [allTimelineItems, filters])

  const noRecordsAtAll = allTimelineItems.length === 0
  const noVisibleResults = !noRecordsAtAll && visibleTimelineItems.length === 0

  const resetFilters = () =>
    setFilters({ search: '', petId: '', visitType: 'All visit types', fromDate: '', toDate: '' })

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-8">
      <MedicalHistoryHero onMyPets={onMyPets} onRegisterPet={onRegisterPet} />

      {(pets.length > 0 || allTimelineItems.length > 0) && (
        <PetHealthSummary pet={primaryPet} records={visibleTimelineItems} />
      )}

      <MedicalHistoryToolbar
        records={asArray(records)}
        vaccinations={asArray(vaccinations)}
        reports={asArray(reports)}
        pets={asArray(pets)}
        filters={filters}
        setFilters={setFilters}
        onReset={resetFilters}
        visitTypeOptions={visitTypeOptions}
        petOptions={petOptions}
      />

      {noRecordsAtAll ? (
        <MedicalHistoryEmptyState onBrowseVets={onBrowseVets} onRegisterPet={onRegisterPet} />
      ) : noVisibleResults ? (
        <section className="rounded-[20px] border border-line/70 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-mist text-teal">
            <Search className="h-6 w-6" strokeWidth={2} />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-ink">No matching records</h3>
          <p className="mt-1.5 text-sm text-muted">Try adjusting your search or filters.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line/80 px-4 py-2.5 text-sm font-bold text-teal transition-colors hover:bg-mist"
          >
            <Filter className="h-4 w-4" />
            Clear filters
          </button>
        </section>
      ) : (
        <MedicalTimeline records={visibleTimelineItems} />
      )}
    </div>
  )
}

export default MedicalHistoryPage