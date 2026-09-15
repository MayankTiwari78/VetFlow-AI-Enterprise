import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { isAuthSessionHandledError } from '../../api/authClient'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { DoctorContext } from '../../context/DoctorContext'

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
})

const unwrap = (responseData, key, fallback) =>
  responseData?.data?.[key] ?? responseData?.[key] ?? fallback
const getId = (item) => String(item?._id || item?.id || '')
const asArray = (items) => (Array.isArray(items) ? items : [])
const pretty = (value) => String(value ?? '').replace(/_/g, ' ')

const STATUS_LABELS = {
  pending: 'Pending Review',
  in_review: 'In Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  modified: 'Modified',
  dismissed: 'Dismissed',
  consultation_required: 'Consultation Required'
}

const statusLabel = (status) => STATUS_LABELS[String(status || '').trim()] || 'Pending Review'

const statusBadgeClass = (status) => {
  switch (String(status || '').trim()) {
    case 'approved':
    case 'reviewed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'modified':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'in_review':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'consultation_required':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'dismissed':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-orange-50 text-orange-700 border-orange-200'
  }
}

const decisionLabel = (decision) =>
  ({
    in_review: 'Review started',
    approve: 'Approved the AI preliminary finding',
    modify: 'Modified / overrode the AI preliminary finding',
    dismiss: 'Dismissed the AI preliminary finding',
    consultation_requested: 'Further consultation required'
  })[String(decision || '').trim()] || pretty(decision) || '—'

const AI_SAFETY_BANNER = 'AI Preliminary Assessment — Not a Diagnosis'
const AI_SAFETY_TEXT =
  'This AI Report is a Preliminary Assessment and must not be considered a diagnosis.'
const PRESCRIPTION_READY_STATUSES = ['approved', 'modified', 'reviewed']

/** Pending combined reports first, then in-review, then the rest; newest first. */
const priorityRank = (report) => {
  const status = String(report?.veterinarianReviewStatus || 'pending')
  const statusRank =
    status === 'pending' ? 0 : status === 'in_review' ? 1 : status === 'consultation_required' ? 2 : 3
  const modalityRank = report?.modality === 'combined' ? 0 : report?.modality === 'image' ? 1 : 2
  return statusRank * 10 + modalityRank
}

const formatStamp = (value) => {
  if (!value) return 'unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

const EMPTY_RX = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: '',
  additionalInstructions: ''
}

const ReviewQueue = () => {
  const { backendUrl } = useContext(AppContext)
  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)
  const token = dToken || aToken

  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const [notes, setNotes] = useState('')
  const [finalCondition, setFinalCondition] = useState('')
  const [finalDiagnosis, setFinalDiagnosis] = useState('')
  const [finalSummary, setFinalSummary] = useState('')
  const [formError, setFormError] = useState('')
  const [prescriptions, setPrescriptions] = useState([])
  const [rxForm, setRxForm] = useState(EMPTY_RX)
  const [rxBusy, setRxBusy] = useState(false)
  const [rxError, setRxError] = useState('')

  const loadQueue = async () => {
    setQueueLoading(true)
    setQueueError('')
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/review-queue`,
        authConfig(token, { params: { limit: 50, sort: '-generatedAt' } })
      )
      const items = asArray(unwrap(data, 'reports', []))
      items.sort(
        (a, b) =>
          priorityRank(a) - priorityRank(b) ||
          new Date(b.generatedAt || b.createdAt || 0) - new Date(a.generatedAt || a.createdAt || 0)
      )
      setQueue(items)
      setSelectedId((current) => current || (items.length ? getId(items[0]) : ''))
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        setQueueError(error?.response?.data?.message || 'Unable to load the review queue.')
      }
    } finally {
      setQueueLoading(false)
    }
  }

  const loadDetail = async (reportId) => {
    if (!reportId) return
    setDetailLoading(true)
    setDetailError('')
    setPendingAction('')
    setFormError('')
    setRxError('')
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/ai-reports/${reportId}/review-detail`,
        authConfig(token)
      )
      const workspace = data?.data ?? {}
      setDetail(workspace)
      const review = workspace?.report?.veterinarianReview ?? {}
      setNotes(review.notes || '')
      setFinalCondition(review.finalAssessment?.condition || '')
      setFinalDiagnosis(review.finalAssessment?.diagnosis || '')
      setFinalSummary(review.finalAssessment?.summary || '')
      setPrescriptions([])
      try {
        const rxResponse = await axios.get(
          `${backendUrl}/api/v1/veterinary/prescriptions`,
          authConfig(token, { params: { aiReportId: reportId, limit: 50 } })
        )
        setPrescriptions(asArray(unwrap(rxResponse.data, 'prescriptions', [])))
      } catch {
        /* prescription history is optional for the workspace */
      }
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        setDetailError(error?.response?.data?.message || 'Unable to load the review workspace.')
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const decide = async (decision) => {
    if (decision === 'approve' || decision === 'modify') {
      if (!finalCondition.trim()) {
        setFormError('A final clinical assessment (condition) is required to approve or modify this report.')
        return
      }
    }
    setActionBusy(true)
    setFormError('')
    try {
      const body = { decision }
      if (notes.trim()) body.notes = notes.trim()
      if (decision === 'approve' || decision === 'modify') {
        body.finalAssessment = {
          condition: finalCondition.trim(),
          ...(finalDiagnosis.trim() ? { diagnosis: finalDiagnosis.trim() } : {}),
          ...(finalSummary.trim() ? { summary: finalSummary.trim() } : {})
        }
      }
      await axios.patch(
        `${backendUrl}/api/v1/veterinary/ai-reports/${selectedId}/review`,
        body,
        authConfig(token)
      )
      toast.success('Review decision recorded.')
      setPendingAction('')
      await loadDetail(selectedId)
      await loadQueue()
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        toast.error(error?.response?.data?.message || 'Unable to record the review decision.')
      }
    } finally {
      setActionBusy(false)
    }
  }

  const submitPrescription = async () => {
    const { medicineName, dosage, frequency, duration, route, additionalInstructions } = rxForm
    if (!medicineName.trim() || !dosage.trim() || !frequency.trim() || !duration.trim()) {
      setRxError('Medicine name, dosage, frequency and duration are required.')
      return
    }
    setRxBusy(true)
    setRxError('')
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-reports/${selectedId}/prescriptions`,
        {
          medicineName: medicineName.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          duration: duration.trim(),
          route: route.trim(),
          additionalInstructions: additionalInstructions.trim()
        },
        authConfig(token)
      )
      toast.success('Prescription created.')
      setRxForm(EMPTY_RX)
      const created = unwrap(data, 'prescription', null)
      if (created) setPrescriptions((current) => [created, ...current])
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        setRxError(error?.response?.data?.message || 'Unable to create the prescription.')
      }
    } finally {
      setRxBusy(false)
    }
  }

  useEffect(() => {
    if (token) void loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, backendUrl])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const report = detail?.report ?? null
  const review = report?.veterinarianReview ?? {}
  const status = String(report?.veterinarianReviewStatus || 'pending')
  const pet =
    detail?.pet ?? detail?.petInfo ?? (typeof report?.petId === 'object' ? report?.petId : null) ?? {}
  const combined = detail?.combinedAssessment ?? report?.combinedAssessment ?? {}
  const combinedResult = combined?.result ?? {}
  const symptom = detail?.symptomEvidence ?? combined?.inputs?.symptom ?? null
  const image =
    detail?.imageEvidence ??
    combined?.inputs?.image ??
    (report?.modality === 'image' ? report?.imageAssessment : null)
  const previousReports = asArray(detail?.previousReports)
  const prescriptionReady = PRESCRIPTION_READY_STATUSES.includes(status)

  return (
    <div className='min-w-0 space-y-6'>
      <section className='rounded-xl border border-line/70 bg-white p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h2 className='text-lg font-bold text-ink'>Veterinarian Review Queue</h2>
            <p className='mt-0.5 text-xs text-muted'>Pending combined AI reports first — supporting evidence reports appear alongside them.</p>
          </div>
          <button type='button' onClick={() => { void loadQueue() }} className='rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist'>Refresh</button>
        </div>
        {queueLoading ? (
          <p className='mt-4 text-sm text-slate-500'>Loading review queue…</p>
        ) : queueError ? (
          <p className='mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>{queueError}</p>
        ) : queue.length === 0 ? (
          <p className='mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600'>No AI reports are awaiting review right now.</p>
        ) : (
          <ul className='mt-4 grid gap-3 lg:grid-cols-2'>
            {queue.map((item) => {
              const petInfo = typeof item?.petId === 'object' ? item?.petId ?? {} : {}
              const selected = getId(item) === selectedId
              return (
                <li key={getId(item)}>
                  <button
                    type='button'
                    onClick={() => setSelectedId(getId(item))}
                    className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-teal bg-teal/5' : 'border-line/70 bg-white hover:border-teal/50'}`}
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-bold text-slate-800'>
                        {petInfo?.name || 'Pet'}
                        <span className='ml-2 text-xs font-medium text-slate-500'>
                          {pretty(petInfo?.species)}{petInfo?.breed ? ` · ${petInfo.breed}` : ''}
                        </span>
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(item?.veterinarianReviewStatus)}`}>
                        {statusLabel(item?.veterinarianReviewStatus)}
                      </span>
                    </div>
                    <p className='mt-1 text-xs text-slate-500'>Generated {formatStamp(item?.generatedAt || item?.createdAt)}</p>
                    <p className='mt-2 text-sm text-slate-700'>
                      AI predicted: <span className='font-semibold'>{pretty(item?.prediction?.predictedCondition || 'Unknown')}</span>
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2 text-[11px]'>
                      {item?.modality === 'combined' && (
                        <span className='rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700'>Combined</span>
                      )}
                      {((Array.isArray(item?.uploadedImages) && item.uploadedImages.length > 0) || item?.modality === 'image') && (
                        <span className='rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700'>Image evidence</span>
                      )}
                      {item?.severity ? (
                        <span className='rounded-md bg-orange-50 px-2 py-0.5 font-semibold text-orange-700'>Severity: {pretty(item.severity)}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {detailLoading ? (
        <section className='rounded-xl border border-line/70 bg-white p-6'>
          <p className='text-sm text-slate-500'>Loading review workspace…</p>
        </section>
      ) : detailError ? (
        <section className='rounded-xl border border-red-200 bg-red-50 p-6'>
          <p className='text-sm text-red-600'>{detailError}</p>
        </section>
      ) : report ? (
        <section className='space-y-4'>
          <div className='rounded-xl border border-amber-300 bg-amber-50 p-4'>
            <p className='text-sm font-bold uppercase tracking-wide text-amber-800'>{AI_SAFETY_BANNER}</p>
            <p className='mt-1 text-xs text-amber-700'>{detail?.safetyWarning || AI_SAFETY_TEXT}</p>
          </div>

          <div className='rounded-xl border border-line/70 bg-white p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <h3 className='text-base font-bold text-ink'>Pet profile</h3>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}>
                {statusLabel(status)}
              </span>
            </div>
            <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3'>
              <div><dt className='text-xs text-slate-500'>Name</dt><dd className='font-medium text-slate-800'>{pet?.name || '—'}</dd></div>
              <div><dt className='text-xs text-slate-500'>Species</dt><dd className='font-medium text-slate-800'>{pretty(pet?.species) || '—'}</dd></div>
              <div><dt className='text-xs text-slate-500'>Breed</dt><dd className='font-medium text-slate-800'>{pretty(pet?.breed) || '—'}</dd></div>
              <div><dt className='text-xs text-slate-500'>Age</dt><dd className='font-medium text-slate-800'>{pet?.age != null && pet?.age !== '' ? `${pet.age} yr` : '—'}</dd></div>
              <div><dt className='text-xs text-slate-500'>Sex</dt><dd className='font-medium text-slate-800'>{pretty(pet?.gender || pet?.sex) || '—'}</dd></div>
              <div><dt className='text-xs text-slate-500'>Allergies</dt><dd className='font-medium text-slate-800'>{asArray(pet?.allergies).length ? asArray(pet?.allergies).join(', ') : 'None recorded'}</dd></div>
              <div className='sm:col-span-3'>
                <dt className='text-xs text-slate-500'>Medical history</dt>
                <dd className='font-medium text-slate-800'>{asArray(pet?.medicalHistory).length ? asArray(pet?.medicalHistory).join(', ') : 'None recorded'}</dd>
              </div>
            </dl>
          </div>

          {previousReports.length > 0 && (
            <div className='rounded-xl border border-line/70 bg-white p-4'>
              <h3 className='text-base font-bold text-ink'>Pet history — previous AI reports</h3>
              <ul className='mt-2 space-y-1 text-sm text-slate-700'>
                {previousReports.slice(0, 6).map((prev) => (
                  <li key={getId(prev)} className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist px-3 py-1.5'>
                    <span>{pretty(prev?.prediction?.predictedCondition) || String(prev?.aiSummary || '').slice(0, 60) || 'Previous assessment'}</span>
                    <span className='text-xs text-slate-500'>{formatStamp(prev?.generatedAt || prev?.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className='grid gap-4 lg:grid-cols-2'>
            <div className='rounded-xl border border-line/70 bg-white p-4'>
              <h3 className='text-base font-bold text-ink'>
                Symptom evidence <span className='text-xs font-medium text-slate-500'>(supporting AI evidence)</span>
              </h3>
              <p className='mt-1 text-xs text-slate-500'>Stage 1 symptom model finding for the same encounter.</p>
              <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                <div><dt className='text-xs text-slate-500'>Model finding</dt><dd className='font-medium text-slate-800'>{pretty(report?.prediction?.predictedCondition) || 'Unknown'}</dd></div>
                <div>
                  <dt className='text-xs text-slate-500'>Confidence</dt>
                  <dd className='font-medium text-slate-800'>
                    {report?.prediction?.confidenceLevel || 'Unknown'}
                    {report?.prediction?.modelProbability != null ? ` (${Math.round(report.prediction.modelProbability * 100)}%)` : ''}
                  </dd>
                </div>
                <div className='sm:col-span-2'>
                  <dt className='text-xs text-slate-500'>Reported symptoms</dt>
                  <dd className='font-medium text-slate-800'>{asArray(report?.symptoms).map(pretty).join(', ') || 'None recorded'}</dd>
                </div>
              </dl>
              {(() => {
                const severityMap = symptom?.symptoms || symptom?.symptomScores || {}
                const keys = ['fever', 'cough', 'diarrhea', 'lethargy', 'loss_of_appetite', 'vomiting']
                const rows = keys
                  .filter((key) => severityMap && severityMap[key] !== undefined && severityMap[key] !== null)
                  .map((key) => [pretty(key), String(severityMap[key])])
                if (!rows.length) return null
                return (
                  <div className='mt-3'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Symptom severities</p>
                    <div className='mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                      {rows.map(([key, value]) => (
                        <div key={key} className='rounded-lg bg-mist px-3 py-1.5'>
                          <p className='text-xs text-slate-500'>{key}</p>
                          <p className='text-sm font-medium text-slate-800'>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className='rounded-xl border border-line/70 bg-white p-4'>
              <h3 className='text-base font-bold text-ink'>
                AI image evidence <span className='text-xs font-medium text-slate-500'>(supporting AI evidence)</span>
              </h3>
              {(() => {
                const imageUrl =
                  image?.imageUrl || image?.image_url || image?.cloudinaryUrl || asArray(report?.uploadedImages)[0] || ''
                const predicted = image?.predictedClass || image?.predictedCondition || image?.result?.predictedCondition
                const band = image?.band || image?.evidenceBand || image?.confidence?.band || image?.imageConfidence?.band
                const probability = image?.probability ?? image?.result?.probability
                const modelVersion = image?.model_version || image?.modelVersion
                const tops = asArray(image?.top_conditions || image?.topConditions)
                return (
                  <div className='mt-2 space-y-2'>
                    <p className='text-xs italic text-slate-500'>
                      Labeled as AI image evidence — supporting input, never a standalone diagnosis.
                    </p>
                    {imageUrl ? (
                      <img src={imageUrl} alt='AI image evidence' className='max-h-56 w-full rounded-lg border border-line object-contain' />
                    ) : (
                      <p className='text-sm text-slate-500'>No persisted image for this report.</p>
                    )}
                    <dl className='grid grid-cols-2 gap-2 text-sm'>
                      {predicted ? (
                        <div className='rounded-lg bg-mist px-3 py-1.5'>
                          <dt className='text-xs text-slate-500'>Predicted condition</dt>
                          <dd className='font-medium text-slate-800'>{pretty(predicted)}</dd>
                        </div>
                      ) : null}
                      {band ? (
                        <div className='rounded-lg bg-mist px-3 py-1.5'>
                          <dt className='text-xs text-slate-500'>Evidence band</dt>
                          <dd className='font-medium text-slate-800'>
                            {pretty(band)}
                            {probability != null ? ` (${Math.round(probability * 100)}%)` : ''}
                          </dd>
                        </div>
                      ) : null}
                      {modelVersion ? (
                        <div className='col-span-2 rounded-lg bg-mist px-3 py-1.5'>
                          <dt className='text-xs text-slate-500'>Model / version</dt>
                          <dd className='font-medium text-slate-800'>{modelVersion}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {tops.length > 0 ? (
                      <p className='text-sm text-slate-700'>
                        <span className='font-semibold'>Possible conditions: </span>
                        {tops
                          .map((t) => `${pretty(t?.class || t?.condition)} (${Math.round((t?.probability ?? t?.score ?? 0) * 100)}%)`)
                          .join(', ')}
                      </p>
                    ) : null}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className='rounded-xl border border-indigo-200 bg-indigo-50/40 p-4'>
            <h3 className='text-base font-bold text-ink'>
              Combined AI assessment <span className='text-xs font-medium text-slate-500'>(primary AI result)</span>
            </h3>
            <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-xs text-slate-500'>Predicted condition</dt>
                <dd className='text-base font-bold text-slate-900'>{pretty(combinedResult?.predictedCondition || report?.prediction?.predictedCondition) || 'Unknown'}</dd>
              </div>
              <div>
                <dt className='text-xs text-slate-500'>Evidence / confidence band</dt>
                <dd className='font-medium text-slate-800'>{combinedResult?.evidenceBand || report?.prediction?.confidenceLevel || 'Unknown'}</dd>
              </div>
              <div>
                <dt className='text-xs text-slate-500'>Engine / contract version</dt>
                <dd className='font-medium text-slate-800'>
                  {report?.modelVersion || combinedResult?.engineVersion || '—'}
                  {report?.contractVersion ? ` · contract ${report.contractVersion}` : ''}
                </dd>
              </div>
              <div>
                <dt className='text-xs text-slate-500'>Contributing evidence</dt>
                <dd className='font-medium text-slate-800'>
                  {asArray(combinedResult?.evidenceUsed).length
                    ? combinedResult.evidenceUsed.map(pretty).join(', ')
                    : combined?.inputs
                      ? Object.keys(combined.inputs).map(pretty).join(', ')
                      : 'Not recorded'}
                </dd>
              </div>
            </dl>
            {asArray(combinedResult?.topConditions).length > 0 && (
              <div className='mt-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Possible conditions</p>
                <ul className='mt-1 space-y-1'>
                  {combinedResult.topConditions.map((row, index) => (
                    <li key={`${row?.condition}-${index}`} className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm'>
                      <span className='font-medium text-slate-800'>{pretty(row?.condition)}</span>
                      <span className='text-xs text-slate-500'>
                        {Math.round((row?.score ?? row?.probability ?? 0) * 100)}%
                        {asArray(row?.source).length ? ` · ${row.source.map(pretty).join(', ')}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {asArray(combinedResult?.conflicts).length > 0 && (
              <p className='mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800'>
                Conflict warning: the symptom and image models disagreed. Both findings are preserved for your clinical judgement.
              </p>
            )}
          </div>

          <div className='rounded-xl border-2 border-teal/40 bg-white p-4'>
            <h3 className='text-base font-bold text-ink'>Veterinarian decision</h3>
            {review.reviewerName || review.reviewedAt ? (
              <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3'>
                <div><dt className='text-xs text-slate-500'>Reviewer</dt><dd className='font-medium text-slate-800'>{review.reviewerName || '—'}</dd></div>
                <div><dt className='text-xs text-slate-500'>Decision</dt><dd className='font-medium text-slate-800'>{decisionLabel(review.decision)}</dd></div>
                <div><dt className='text-xs text-slate-500'>Reviewed</dt><dd className='font-medium text-slate-800'>{formatStamp(review.reviewedAt)}</dd></div>
              </dl>
            ) : null}
            {review.notes ? (
              <p className='mt-2 rounded-lg bg-mist px-3 py-2 text-sm text-slate-700'>
                <span className='font-semibold'>Notes: </span>
                {review.notes}
              </p>
            ) : null}
            {review.finalAssessment ? (
              <div className='mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm'>
                <p className='font-semibold text-emerald-800'>Final assessment: {review.finalAssessment.condition}</p>
                {review.finalAssessment.diagnosis ? <p className='text-slate-700'>{review.finalAssessment.diagnosis}</p> : null}
                {review.finalAssessment.summary ? <p className='text-slate-600'>{review.finalAssessment.summary}</p> : null}
              </div>
            ) : null}

            {pendingAction ? (
              <div className='mt-4 rounded-lg border border-line bg-mist/60 p-3'>
                <p className='text-sm font-semibold text-slate-700'>
                  {pendingAction === 'approve' && 'Confirm approval of this AI report?'}
                  {pendingAction === 'modify' && 'Confirm modification / override of this AI report?'}
                  {pendingAction === 'dismiss' && 'Dismiss this AI report? The owner will see it as dismissed.'}
                  {pendingAction === 'consultation_requested' && 'Mark this report as requiring further consultation?'}
                  {pendingAction === 'in_review' && 'Start your review of this report?'}
                </p>
                {(pendingAction === 'approve' || pendingAction === 'modify') && (
                  <div className='mt-3 space-y-2'>
                    <input
                      value={finalCondition}
                      onChange={(event) => setFinalCondition(event.target.value)}
                      placeholder='Final clinical assessment — condition (required)'
                      className='w-full rounded-lg border border-line bg-white px-3 py-2 text-sm'
                    />
                    <input
                      value={finalDiagnosis}
                      onChange={(event) => setFinalDiagnosis(event.target.value)}
                      placeholder='Diagnosis wording (optional)'
                      className='w-full rounded-lg border border-line bg-white px-3 py-2 text-sm'
                    />
                    <textarea
                      value={finalSummary}
                      onChange={(event) => setFinalSummary(event.target.value)}
                      placeholder='Clinical summary (optional)'
                      rows={2}
                      className='w-full rounded-lg border border-line bg-white px-3 py-2 text-sm'
                    />
                  </div>
                )}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder='Veterinarian notes (optional)'
                  rows={2}
                  className='mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm'
                />
                {formError ? <p className='mt-2 text-sm text-red-600'>{formError}</p> : null}
                <div className='mt-3 flex flex-wrap gap-2'>
                  <button
                    type='button'
                    disabled={actionBusy}
                    onClick={() => void decide(pendingAction)}
                    className='rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50'
                  >
                    {actionBusy ? 'Saving…' : 'Confirm decision'}
                  </button>
                  <button
                    type='button'
                    disabled={actionBusy}
                    onClick={() => setPendingAction('')}
                    className='rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className='mt-4 flex flex-wrap gap-2'>
                <button
                  type='button'
                  disabled={actionBusy || status === 'in_review'}
                  onClick={() => setPendingAction('in_review')}
                  className='rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-mist disabled:opacity-40'
                >
                  Start Review
                </button>
                <button
                  type='button'
                  disabled={actionBusy}
                  onClick={() => { setFormError(''); setPendingAction('approve') }}
                  className='rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
                >
                  Approve
                </button>
                <button
                  type='button'
                  disabled={actionBusy}
                  onClick={() => { setFormError(''); setPendingAction('modify') }}
                  className='rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50'
                >
                  Modify
                </button>
                <button
                  type='button'
                  disabled={actionBusy}
                  onClick={() => setPendingAction('dismiss')}
                  className='rounded-lg bg-slate-600 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50'
                >
                  Dismiss
                </button>
                <button
                  type='button'
                  disabled={actionBusy}
                  onClick={() => setPendingAction('consultation_requested')}
                  className='rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50'
                >
                  Consultation Required
                </button>
              </div>
            )}
            <p className='mt-2 text-xs text-slate-500'>
              The AI prediction is never altered — your decision and final assessment are stored separately and fully auditable.
            </p>
          </div>

          <div className='rounded-xl border border-line/70 bg-white p-4'>
            <h3 className='text-base font-bold text-ink'>Prescription</h3>
            {prescriptionReady ? (
              <div className='mt-3 space-y-3'>
                <div className='grid gap-2 sm:grid-cols-2'>
                  <input
                    value={rxForm.medicineName}
                    onChange={(event) => setRxForm({ ...rxForm, medicineName: event.target.value })}
                    placeholder='Medicine name (required)'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                  <input
                    value={rxForm.dosage}
                    onChange={(event) => setRxForm({ ...rxForm, dosage: event.target.value })}
                    placeholder='Dosage (required)'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                  <input
                    value={rxForm.frequency}
                    onChange={(event) => setRxForm({ ...rxForm, frequency: event.target.value })}
                    placeholder='Frequency (required)'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                  <input
                    value={rxForm.duration}
                    onChange={(event) => setRxForm({ ...rxForm, duration: event.target.value })}
                    placeholder='Duration (required)'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                  <input
                    value={rxForm.route}
                    onChange={(event) => setRxForm({ ...rxForm, route: event.target.value })}
                    placeholder='Route (e.g. Oral)'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                  <input
                    value={rxForm.additionalInstructions}
                    onChange={(event) => setRxForm({ ...rxForm, additionalInstructions: event.target.value })}
                    placeholder='Additional instructions'
                    className='rounded-lg border border-line px-3 py-2 text-sm'
                  />
                </div>
                {rxError ? <p className='text-sm text-red-600'>{rxError}</p> : null}
                <button
                  type='button'
                  disabled={rxBusy}
                  onClick={() => void submitPrescription()}
                  className='rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50'
                >
                  {rxBusy ? 'Creating…' : 'Create Prescription'}
                </button>
                {prescriptions.length > 0 && (
                  <ul className='space-y-2'>
                    {prescriptions.map((rx) => (
                      <li key={getId(rx)} className='rounded-lg bg-mist px-3 py-2 text-sm'>
                        <p className='font-semibold text-slate-800'>
                          {rx?.medicineName} — {rx?.dosage}, {rx?.frequency}, {rx?.duration}{rx?.route ? `, ${rx.route}` : ''}
                        </p>
                        {rx?.additionalInstructions ? <p className='text-xs text-slate-600'>{rx.additionalInstructions}</p> : null}
                        <p className='text-xs text-slate-500'>Issued {formatStamp(rx?.issuedAt)} · status {pretty(rx?.status)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className='text-xs text-slate-500'>
                  Prescriptions are created only by you, linked to this report and your review decision — never generated by the AI model.
                </p>
              </div>
            ) : (
              <p className='mt-2 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600'>
                Prescriptions unlock after you approve or modify this report. AI output alone can never generate medication.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className='rounded-xl border border-line/70 bg-white p-6'>
          <p className='text-sm text-slate-500'>Select a report from the queue to open its review workspace.</p>
        </section>
      )}
    </div>
  )
}

export default ReviewQueue