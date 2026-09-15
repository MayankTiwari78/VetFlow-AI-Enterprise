import axios from 'axios'
import { useState } from 'react'
import { toast } from 'react-toastify'

import { isAuthSessionHandledError } from '../../api/authClient'
import { formatDateTime, safeStamp, sortNewestFirst, downloadTextFile, buildCombinedReportText } from './reportUtils'

const SYMPTOMS = ['Fever', 'Cough', 'Diarrhea', 'Lethargy', 'Loss_of_Appetite']
const empty = () => ({ Fever: 0, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 })
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } })
const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`
const pretty = (s) => String(s ?? '').replace(/_/g, ' ')
const SEVERITY_LABELS = { 0: 'None (0)', 1: 'Mild (1)', 2: 'Moderate (2)', 3: 'Severe (3)' }
const GENERIC_COMBINED_ERROR = 'Combined AI assessment could not be completed. Please try again.'

/**
 * Stage 3 — Combined AI Preliminary Assessment (the ONE primary result).
 * Steps 2-4 collect evidence (symptoms, optional saved image report) and run
 * the deterministic fusion engine; the FINAL RESULT block renders the unified
 * preliminary assessment. Standalone symptom/image analyses live under
 * "Supporting evidence" in the dashboard — they are inputs, not reports.
 */
const CombinedAssessment = ({ backendUrl, token, pet, imageReports = [], onReportSaved }) => {
  const [symptoms, setSymptoms] = useState(empty)
  const [imageReportId, setImageReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [savedReportId, setSavedReportId] = useState(null)
  const [savedReportAt, setSavedReportAt] = useState('')
  const [error, setError] = useState('')

  const hasSymptoms = Object.values(symptoms).some((v) => v > 0)
  const canRun = Boolean(pet?.id) && (hasSymptoms || imageReportId)

  const buildPayload = () => {
    const payload = { petId: pet.id }
    if (hasSymptoms) payload.symptoms = symptoms
    if (imageReportId) payload.imageReportId = imageReportId
    return payload
  }

  const run = async () => {
    if (!pet?.id) { setError('Please select a pet first.'); return }
    if (!canRun) { setError('Enter at least one symptom severity or pick a saved image report.'); return }
    setLoading(true); setError(''); setAssessment(null); setSavedReportId(null)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/combined-assessment`, buildPayload(), auth(token)
      )
      setAssessment(data?.data?.assessment ?? null)
    } catch (e) {
      if (!isAuthSessionHandledError(e)) {
        setError(e.response?.data?.message || GENERIC_COMBINED_ERROR)
      }
    } finally { setLoading(false) }
  }

  const save = async () => {
    if (!assessment || !pet?.id || saving) return
    setSaving(true); setError('')
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/combined-assessment-and-save`, buildPayload(), auth(token)
      )
      const report = data?.data?.report ?? null
      if (!report?._id) throw new Error('Unexpected save response')
      setSavedReportId(String(report._id))
      setSavedReportAt(report.createdAt || report.generatedAt || report.created_at || '')
      toast.success('Combined preliminary assessment saved to history')
      onReportSaved?.()
    } catch (e) {
      if (!isAuthSessionHandledError(e)) {
        setError(e.response?.data?.message || 'Saving the combined assessment failed. Please try again.')
      }
    } finally { setSaving(false) }
  }

  const sortedImageReports = sortNewestFirst(imageReports)
  const selectedImage = sortedImageReports.find((r) => String(r._id) === String(imageReportId)) || null
  const evidenceIncluded = [
    'Pet history',
    ...((assessment?.inputs?.symptom || hasSymptoms) ? ['Symptom assessment'] : []),
    ...((assessment?.inputs?.image || imageReportId) ? ['AI image assessment'] : [])
  ]
  const downloadCombined = () => {
    if (!assessment) return
    const h = assessment.inputs?.history ?? {}
    const mergedPet = { ...pet, species: pet?.species || h.species, breed: h.breed, age: h.age }
    const imageInput = assessment.inputs?.image
    const text = buildCombinedReportText({
      pet: mergedPet,
      capturedHistory: h,
      symptom: { symptoms, prediction: assessment.inputs?.symptom, timestamp: savedReportAt, reportId: savedReportId },
      image: imageInput ? {
        imageFindings: { predicted_class: imageInput.predictedClass, top_conditions: imageInput.topConditions },
        imageConfidence: { band: imageInput.band, probability: imageInput.probability },
        timestamp: selectedImage ? (selectedImage.createdAt || selectedImage.generatedAt) : savedReportAt,
        reportId: imageInput.imageReportId
      } : null,
      result: assessment.combinedAssessment,
      narrative: assessment.narrative,
      timestamp: savedReportAt,
      reviewStatus: savedReportId ? 'Pending veterinarian review' : 'Not saved yet (preview only)',
      evidenceUsed: evidenceIncluded
    })
    downloadTextFile(`combined-ai-animal-health-report-${(savedReportId || 'preview').slice(-8)}.txt`, text)
  }

  const result = assessment?.combinedAssessment
  const disagree = result?.modalityDisagreement === true
  const symptomsConsidered = SYMPTOMS.filter((key) => symptoms[key] > 0)
  const history = assessment?.inputs?.history

  return (
    <section className='mf-card p-5'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-lg font-semibold text-ink'>Combined AI Animal Health Report</h3>
        <span className='rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white'>PRIMARY RESULT</span>
      </div>
      <p className='mt-1 text-sm text-slate-600'>
        ONE unified preliminary assessment built from symptom evidence, an optional saved image
        assessment and pet history. AI decision support only — not a diagnosis; veterinarian review
        is always required.
      </p>
      {error && <div role='alert' className='mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}

      {/* STEP 3 — Symptom assessment */}
      <div className='mt-5'>
        <p className='text-xs font-bold uppercase tracking-wide text-teal'>Step 3 — Symptom assessment</p>
        <div className='mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {SYMPTOMS.map((key) => (
            <label key={key} className='mf-label'>
              {key.replace(/_/g, ' ')}
              <select className='mf-field mt-1' value={symptoms[key]} onChange={(e) => setSymptoms({ ...symptoms, [key]: Number(e.target.value) })}>
                <option value={0}>{SEVERITY_LABELS[0]}</option>
                <option value={1}>{SEVERITY_LABELS[1]}</option>
                <option value={2}>{SEVERITY_LABELS[2]}</option>
                <option value={3}>{SEVERITY_LABELS[3]}</option>
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* STEP 2 — AI image evidence (selector over SAVED image reports) */}
      <div className='mt-5'>
        <p className='text-xs font-bold uppercase tracking-wide text-teal'>Step 2 — AI image evidence</p>
        <label className='mf-label mt-2 block'>
          Saved image report to include (optional)
          <select className='mf-field mt-1' value={imageReportId} onChange={(e) => { setImageReportId(e.target.value); setSavedReportId(null) }}>
            <option value=''>None</option>
            {sortedImageReports.map((r) => (
              <option key={String(r._id)} value={String(r._id)}>
                {formatDateTime(r.generatedAt || r.createdAt) || 'unknown time'} — {pretty(r.prediction?.predictedCondition)} ({pretty(r.prediction?.confidenceLevel)})
              </option>
            ))}
          </select>
        </label>
                {imageReports.length > 0 ? (
          <p className='mt-1 text-xs text-slate-500'>
            {imageReports.length} saved image assessment{imageReports.length === 1 ? '' : 's'} available for this pet.
          </p>
                ) : (
          <p className='mt-1 text-xs text-slate-500'>
            No saved image evidence yet. To include a saved image assessment, run an image assessment
            and press <strong>Save Report</strong> in the Image Evidence tool above.
          </p>
        )}
      </div>

      {/* FINAL — run the combined assessment */}
      <div className='mt-5'>
        <p className='text-xs font-bold uppercase tracking-wide text-teal'>FINAL — Combined AI Animal Health Report</p>
        <div className='mt-2 flex flex-wrap gap-3'>
          <button className='mf-button' type='button' disabled={loading || saving || !canRun} onClick={run}>
            {loading ? 'Running combined assessment...' : 'Run Combined Assessment'}
          </button>
          {assessment && (
            <button className='mf-button' type='button' disabled={loading || saving || Boolean(savedReportId)} onClick={save}>
              {saving ? 'Saving...' : savedReportId ? '✓ Saved to history' : 'Save Report'}
            </button>
          )}
        </div>
        {loading && (
          <div className='mt-3 flex items-center gap-3 rounded-md border border-line/70 bg-white px-4 py-3 text-sm text-muted'>
            <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent' aria-hidden='true' />
            Combining symptom, image and history evidence...
          </div>
        )}
      </div>

      {/* FINAL RESULT — the ONE combined preliminary assessment */}
      {disagree && (
        <div role='status' className='mt-5 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800'>
          The symptom and image models disagree. Both results are preserved below for the veterinarian; neither was suppressed.
        </div>
      )}

      {result && (
        <div className='mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4'>
          <p className='text-sm font-bold uppercase tracking-wide text-amber-800'>FINAL — Combined AI Animal Health Report</p>
          <p className='mt-1 text-xs text-slate-600'>Generated: {formatDateTime(savedReportAt) || 'not saved yet (preview)'}</p>
          <div className='mt-3 grid gap-3 text-sm md:grid-cols-2'>

            {/* Evidence traceability */}
            <div><p className='font-semibold text-slate-700'>Symptoms considered</p>
              <p className='mt-1 text-slate-600'>
                {symptomsConsidered.length > 0
                  ? symptomsConsidered.map((key) => `${key.replace(/_/g, ' ')} (${SEVERITY_LABELS[symptoms[key]]})`).join(', ')
                  : 'No symptom severities recorded'}
              </p>
            </div>
            <div><p className='font-semibold text-slate-700'>Symptom model finding</p>
              <p className='mt-1 text-slate-600'>
                {assessment.inputs?.symptom
                  ? `${pretty(assessment.inputs.symptom.condition)} (${pretty(assessment.inputs.symptom.confidenceLevel)})`
                  : 'Not used'}
              </p>
            </div>
            <div><p className='font-semibold text-slate-700'>Image findings</p>
              <p className='mt-1 text-slate-600'>
                {assessment.inputs?.image
                  ? `${pretty(assessment.inputs.image.predictedClass)} (${pretty(assessment.inputs.image.band)})${assessment.inputs.image.imageReportId ? ' · report ' + String(assessment.inputs.image.imageReportId).slice(-6) : ''}`
                  : 'No image evidence used'}
              </p>
            </div>
            <div><p className='font-semibold text-slate-700'>Pet history considered</p>
              <p className='mt-1 text-slate-600'>
                                {history
                  ? `Species: ${pretty(history.species ?? 'n/a')}${history.breed ? ' · breed: ' + pretty(history.breed) : ''}${history.age != null ? ' · age: ' + history.age + ' yr' : ''}${history.allergies?.length ? ' · allergies: ' + history.allergies.join(', ') : ''} · prior AI reports referenced: ${history.priorConditionCount ?? 0}`
                  : 'Not used'}
              </p>
            </div>

            {assessment.narrative && (
              <div className='md:col-span-2'><p className='font-semibold text-slate-700'>AI summary</p>
                <p className='mt-1 text-slate-600'>{assessment.narrative}</p></div>
            )}
            <div className='md:col-span-2'><p className='font-semibold text-slate-700'>Recommendations</p>
              <ul className='mt-1 list-disc space-y-1 pl-5 text-slate-600'>
                <li>Veterinarian review is required before any treatment decision.</li>
                <li>This is a preliminary combined AI assessment, not a clinical diagnosis.</li>
              </ul>
            </div>
            <div><p className='font-semibold text-slate-700'>Veterinarian review status</p>
              <p className='mt-1 text-slate-600'>{savedReportId ? 'Pending veterinarian review (saved to history)' : 'Required — save the report to route it for veterinarian review'}</p></div>
            <div><p className='font-semibold text-slate-700'>Engine / contract</p>
              <p className='mt-1 text-slate-600'>{result.engineVersion ?? assessment.engineVersion} · contract {result.contractVersion ?? assessment.contractVersion}</p></div>
          </div>
          <div className='mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-slate-600'>
            <p className='font-semibold text-slate-700'>Evidence included:</p>
            <p>✓ Pet history</p>
            <p>{(assessment.inputs?.symptom || hasSymptoms) ? '✓ Symptom assessment' : 'Symptom assessment: not included'}</p>
            <p>{assessment.inputs?.image ? '✓ AI image assessment' : 'Image evidence: Not included'}</p>
          </div>
          {result.conflicts?.length > 0 && (
            <details className='mt-3 text-xs text-slate-600'>
              <summary className='cursor-pointer font-semibold text-slate-700'>Modality conflict detail</summary>
              <ul className='mt-2 space-y-1'>
                {result.conflicts.map((c, i) => (
                  <li key={i}>Symptom: {pretty(c.symptomCondition)} vs Image: {pretty(c.imageCondition)} (evidence gap {c.magnitude})</li>
                ))}
              </ul>
            </details>
          )}
          <p className='mt-4 rounded-md border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-800'>
            This AI Report is a Preliminary Assessment and must not be considered a diagnosis.
          </p>
          <button className='mf-button mt-3' type='button' onClick={downloadCombined}>Download Combined Report</button>
          {result.disclaimer && <p className='mt-2 text-xs italic text-slate-500'>{result.disclaimer}</p>}
          {result.confidenceLimitation && <p className='mt-1 text-xs italic text-slate-500'>{result.confidenceLimitation}</p>}
        </div>
      )}

      {savedReportId && (
        <div role='status' className='mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
          <p className='font-semibold'>Saved to AI Health Reports history.</p>
          <p className='mt-1 text-xs font-normal'>Report ID: {savedReportId}. It appears in the history below and awaits veterinarian review (pending).</p>
        </div>
      )}
    </section>
  )
}

export default CombinedAssessment

