import { useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  formatDateTime,
  pretty,
  reviewBadgeClass,
  reviewDecisionLabel,
  reviewStatusLabel
} from './reportUtils'

const AI_SAFETY_NOTE =
  'This AI Report is a Preliminary Assessment and must not be considered a diagnosis.'

/**
 * Stage 4 — OWNER-side "Veterinarian Review" section.
 *
 * Rendered inside every persisted AI report card on /pet-owner/ai-reports.
 * The Combined AI assessment stays the PRIMARY result; this section clearly
 * separates the veterinarian's clinical decision from the AI output.
 *
 * Reuses ONLY existing Stage 4 backend APIs (no new endpoints, no new reports):
 * - GET  /api/v1/veterinary/veterinarians          → pick a veterinarian
 * - POST /api/v1/veterinary/consultation-requests  → request review; the reason
 *   references the EXISTING combined report ID, so no duplicate report is made.
 */
const VeterinarianReviewSection = ({ report, backendUrl, token, onReviewRequested }) => {
  const status = String(report?.veterinarianReviewStatus || 'pending')
  const review = report?.veterinarianReview || {}
  const hasReview = Boolean(review.reviewedAt || review.reviewerName || review.decision)
  const isPending = status === 'pending' && !hasReview

  const reportId = report?._id || report?.id ? String(report?._id || report?.id) : ''
  const petId = useMemo(() => {
    const value = report?.petId
    if (!value) return ''
    if (typeof value === 'object') return String(value._id || value.id || '')
    return String(value)
  }, [report?.petId])

  const aiFinding =
    report?.combinedAssessment?.result?.predictedCondition ||
    (Array.isArray(report?.possibleConditions) && report.possibleConditions[0]) ||
    ''

  const [pickerOpen, setPickerOpen] = useState(false)
  const [veterinarians, setVeterinarians] = useState([])
  const [veterinariansLoading, setVeterinariansLoading] = useState(false)
  const [veterinariansError, setVeterinariansError] = useState('')
  const [selectedVeterinarianId, setSelectedVeterinarianId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requested, setRequested] = useState(() => {
    if (typeof window === 'undefined' || !reportId) return false
    try {
      return window.localStorage.getItem(`vetReviewRequested:${reportId}`) === '1'
    } catch {
      return false
    }
  })

  const openPicker = async () => {
    setPickerOpen(true)
    if (veterinarians.length || veterinariansLoading) return
    setVeterinariansLoading(true)
    setVeterinariansError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/veterinarians`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const payload = data?.data || {}
      const list = payload.veterinarians || payload.vets || payload.items || []
      setVeterinarians(Array.isArray(list) ? list : [])
    } catch {
      setVeterinariansError('Unable to load the veterinarian list right now. Please try again.')
    } finally {
      setVeterinariansLoading(false)
    }
  }

  const requestReview = async () => {
    if (!selectedVeterinarianId) {
      toast.error('Select a veterinarian to request the review.')
      return
    }
    if (!petId || !reportId) {
      toast.error('This report cannot be linked to a review request. Please refresh and try again.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post(
        `${backendUrl}/api/v1/veterinary/consultation-requests`,
        {
          petId,
          veterinarianId: selectedVeterinarianId,
          reason:
            `Veterinarian review requested for Combined AI report ${reportId}` +
            (aiFinding ? ` — AI preliminary finding: ${aiFinding}` : '') +
            '. The AI result is a preliminary assessment and is not a diagnosis.',
          preferredDates: []
        },
        { withCredentials: true, headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (reportId && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`vetReviewRequested:${reportId}`, '1')
        } catch {
          /* storage unavailable — the live status badge remains the source of truth */
        }
      }
      toast.success('Review requested. A veterinarian will review this report.')
      setRequested(true)
      setPickerOpen(false)
      await onReviewRequested?.()
    } catch (error) {
      const message = error?.response?.data?.message
      toast.error(
        typeof message === 'string' && message
          ? message
          : 'Unable to submit the review request. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className='mt-4 rounded-xl border border-slate-200 bg-white' aria-label='Veterinarian review'>
      <header className='flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3'>
        <div>
          <h4 className='text-sm font-semibold text-slate-800'>Veterinarian Review</h4>
          <p className='mt-0.5 text-xs text-slate-500'>
            Clinical decision by a licensed veterinarian — clearly separate from the AI preliminary assessment above.
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${reviewBadgeClass(status)}`}>
          {reviewStatusLabel(status)}
        </span>
      </header>

      <div className='px-4 py-3 text-sm text-slate-700'>
        {hasReview ? (
          <div className='space-y-3'>
            <dl className='grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3'>
              <div>
                <dt className='text-xs font-medium uppercase tracking-wide text-slate-500'>Reviewed by</dt>
                <dd className='text-sm font-medium text-slate-800'>{review.reviewerName || 'Veterinarian'}</dd>
              </div>
              <div>
                <dt className='text-xs font-medium uppercase tracking-wide text-slate-500'>Decision</dt>
                <dd className='text-sm font-medium text-slate-800'>{reviewDecisionLabel(review.decision)}</dd>
              </div>
              <div>
                <dt className='text-xs font-medium uppercase tracking-wide text-slate-500'>Reviewed</dt>
                <dd className='text-sm font-medium text-slate-800'>{formatDateTime(review.reviewedAt) || '—'}</dd>
              </div>
            </dl>
            {review.notes ? (
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Veterinarian notes</p>
                <p className='mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700'>{review.notes}</p>
              </div>
            ) : null}
            {review.finalAssessment ? (
              <div className='rounded-lg border border-emerald-200 bg-emerald-50/60 p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>Final veterinarian assessment</p>
                <p className='mt-1 text-sm font-semibold text-slate-800'>{review.finalAssessment.condition}</p>
                {review.finalAssessment.diagnosis ? (
                  <p className='mt-0.5 text-sm text-slate-700'>{review.finalAssessment.diagnosis}</p>
                ) : null}
                {review.finalAssessment.summary ? (
                  <p className='mt-0.5 text-sm text-slate-600'>{review.finalAssessment.summary}</p>
                ) : null}
              </div>
            ) : null}
            {status === 'consultation_required' && review.consultationRequestNote ? (
              <p className='rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800'>
                <span className='font-semibold'>Consultation requested: </span>
                {review.consultationRequestNote}
              </p>
            ) : null}
          </div>
        ) : isPending ? (
          requested ? (
            <div className='space-y-2'>
              <p className='inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700'>
                Review requested
              </p>
              <p className='text-sm text-slate-600'>
                Current status: <span className='font-semibold'>{reviewStatusLabel(status)}</span>.
                This section updates as soon as a veterinarian starts the review.
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-sm text-slate-600'>
                A veterinarian has not reviewed this report yet. Request a review so a licensed
                veterinarian can confirm, modify or dismiss the AI preliminary finding.
              </p>
              {!pickerOpen ? (
                <button
                  type='button'
                  onClick={() => { void openPicker() }}
                  disabled={!reportId || !petId}
                  title={!reportId || !petId ? 'Save the report first — reviews are linked to the persisted combined report.' : undefined}
                  className='inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Request Veterinarian Review
                </button>
              ) : (
                <div className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
                  {veterinariansLoading ? (
                    <p className='text-sm text-slate-500'>Loading veterinarians…</p>
                  ) : null}
                  {veterinariansError ? (
                    <p className='text-sm text-red-600'>{veterinariansError}</p>
                  ) : null}
                  {!veterinariansLoading && !veterinariansError && veterinarians.length === 0 ? (
                    <p className='text-sm text-slate-600'>
                      No veterinarians are listed yet. Please contact your clinic directly to arrange
                      a review of this report.
                    </p>
                  ) : null}
                  {veterinarians.length > 0 ? (
                    <div className='space-y-2'>
                      <label
                        className='block text-xs font-semibold uppercase tracking-wide text-slate-500'
                        htmlFor={`vet-select-${reportId}`}
                      >
                        Choose a veterinarian
                      </label>
                      <select
                        id={`vet-select-${reportId}`}
                        value={selectedVeterinarianId}
                        onChange={(event) => setSelectedVeterinarianId(event.target.value)}
                        className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800'
                      >
                        <option value=''>Select…</option>
                        {veterinarians.map((veterinarian) => {
                          const id = String(veterinarian?._id || veterinarian?.id || '')
                          const name = veterinarian?.name || veterinarian?.doctor?.name || 'Veterinarian'
                          const clinic = veterinarian?.clinicName || ''
                          const specialization = Array.isArray(veterinarian?.specialization)
                            ? veterinarian.specialization.map(pretty).join(', ')
                            : ''
                          return (
                            <option key={id} value={id}>
                              {[name, clinic, specialization].filter(Boolean).join(' — ')}
                            </option>
                          )
                        })}
                      </select>
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          onClick={() => { void requestReview() }}
                          disabled={submitting || !selectedVeterinarianId}
                          className='inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {submitting ? 'Requesting…' : 'Send review request'}
                        </button>
                        <button
                          type='button'
                          onClick={() => setPickerOpen(false)}
                          className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600'
                        >
                          Cancel
                        </button>
                      </div>
                      <p className='text-xs text-slate-500'>
                        This uses the existing consultation-request workflow and references the current
                        combined report — no new AI report is created.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        ) : (
          <p className='text-sm text-slate-600'>
            Current status: <span className='font-semibold'>{reviewStatusLabel(status)}</span>.
            {status === 'in_review'
              ? ' A veterinarian is reviewing this report.'
              : status === 'consultation_required'
                ? ' Further consultation has been requested — your veterinarian will contact you.'
                : ' Review details will appear here as soon as they are recorded.'}
          </p>
        )}
        <p className='mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500'>{AI_SAFETY_NOTE}</p>
      </div>
    </section>
  )
}

export default VeterinarianReviewSection
