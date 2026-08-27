import axios from 'axios'
import { useState } from 'react'
import { toast } from 'react-toastify'

import { isAuthSessionHandledError } from '../../api/authClient'

const SYMPTOMS = ['Fever', 'Cough', 'Diarrhea', 'Lethargy', 'Loss_of_Appetite']
const empty = () => ({ Fever: 0, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 })
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } })
const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`
const pretty = (s) => String(s ?? '').replace(/_/g, ' ')

/**
 * Stage 3 â€” Combined AI Assessment (deterministic fusion of Stage 1 symptoms +
 * Stage 2C image + pet history). Preliminary decision support ONLY; always
 * requires veterinarian review. Symptom/image flows remain untouched.
 */
const CombinedAssessment = ({ backendUrl, token, pet, imageReports = [], onReportSaved }) => {
  const [symptoms, setSymptoms] = useState(empty)
  const [imageReportId, setImageReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [savedReportId, setSavedReportId] = useState(null)
  const [error, setError] = useState('')

  const hasSymptoms = Object.values(symptoms).some((v) => v > 0)
  const canRun = Boolean(pet?.id) && (hasSymptoms || imageReportId)

  const run = async () => {
    if (!pet?.id) { setError('Please select a pet first.'); return }
    if (!canRun) { setError('Enter at least one symptom severity or pick a saved image report.'); return }
    setLoading(true); setError(''); setAssessment(null); setSavedReportId(null)
    try {
      const payload = { petId: pet.id }
      if (hasSymptoms) payload.symptoms = symptoms
      if (imageReportId) payload.imageReportId = imageReportId
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/combined-assessment`, payload, auth(token)
      )
      setAssessment(data?.data?.assessment ?? null)
    } catch (e) {
      if (!isAuthSessionHandledError(e)) {
        setError(e.response?.data?.message || e.message || 'Combined AI assessment failed')
      }
    } finally { setLoading(false) }
  }

  const save = async () => {
    if (!assessment || !pet?.id || saving) return
    setSaving(true); setError('')
    try {
      const payload = { petId: pet.id }
      if (hasSymptoms) payload.symptoms = symptoms
      if (imageReportId) payload.imageReportId = imageReportId
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/combined-assessment-and-save`, payload, auth(token)
      )
      const report = data?.data?.report ?? null
      if (!report?._id) throw new Error('Unexpected save response')
      setSavedReportId(String(report._id))
      toast.success('Combined preliminary assessment saved to history')
      onReportSaved?.()
    } catch (e) {
      if (!isAuthSessionHandledError(e)) {
        setError(e.response?.data?.message || e.message || 'Saving combined assessment failed')
      }
    } finally { setSaving(false) }
  }

  const result = assessment?.combinedAssessment
  const disagree = result?.modalityDisagreement === true
  return (
    <div className='mf-card p-5'>
      <h3 className='text-lg font-semibold text-ink'>Combined AI Assessment</h3>
      <p className='mt-1 text-sm text-slate-600'>
        Fuses symptom evidence, a saved image assessment (optional) and pet history into one preliminary view.
        AI decision support only - not a diagnosis; veterinarian review is always required.
      </p>
      {error && <div role='alert' className='mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}

      <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        {SYMPTOMS.map((key) => (
          <label key={key} className='mf-label'>
            {key.replace(/_/g, ' ')}
            <select className='mf-field mt-1' value={symptoms[key]} onChange={(e) => setSymptoms({ ...symptoms, [key]: Number(e.target.value) })}>
              <option value={0}>None (0)</option><option value={1}>Mild (1)</option><option value={2}>Moderate (2)</option><option value={3}>Severe (3)</option>
            </select>
          </label>
        ))}
      </div>

      <label className='mf-label mt-4 block'>
        Saved image report to include (optional)
        <select className='mf-field mt-1' value={imageReportId} onChange={(e) => { setImageReportId(e.target.value); setSavedReportId(null) }}>
          <option value=''>None</option>
          {imageReports.map((r) => (
            <option key={String(r._id)} value={String(r._id)}>
              {new Date(r.generatedAt || r.createdAt).toLocaleDateString()} - {pretty(r.prediction?.predictedCondition)} ({pretty(r.prediction?.confidenceLevel)})
            </option>
          ))}
        </select>
      </label>

      <div className='mt-4 flex flex-wrap gap-3'>
        <button className='mf-button' type='button' disabled={loading || saving || !canRun} onClick={run}>
          {loading ? 'Running combined assessment...' : 'Run Combined Assessment'}
        </button>
        {assessment && (
          <button className='mf-button' type='button' disabled={loading || saving || Boolean(savedReportId)} onClick={save}>
            {saving ? 'Saving...' : savedReportId ? '\u2713 Saved to history' : 'Save Report'}
          </button>
        )}
      </div>

      {loading && (
        <div className='mt-4 flex items-center gap-3 rounded-md border border-line/70 bg-white px-4 py-3 text-sm text-muted'>
          <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent' aria-hidden='true' />
          Combining symptom, image and history evidence...
        </div>
      )}

      {disagree && (
        <div role='status' className='mt-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800'>
          The symptom and image models disagree. Both results are preserved below for the veterinarian; neither was suppressed.
        </div>
      )}

      {result && (
        <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
          <p className='text-sm font-semibold text-amber-800'>This AI Report is a Preliminary Assessment and must not be considered a diagnosis.</p>
          <div className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
            <div><p className='font-semibold text-slate-700'>Combined result</p><p className='mt-1 text-slate-600'>{pretty(result.predictedCondition)}</p></div>
            <div><p className='font-semibold text-slate-700'>Evidence band</p><p className='mt-1 font-semibold text-slate-600'>{result.evidenceBand}</p></div>
            <div className='md:col-span-2'><p className='font-semibold text-slate-700'>Top conditions (evidence-weighted)</p>
              <ul className='mt-1 space-y-1 text-slate-600'>
                {result.topConditions?.map((row) => (
                  <li key={String(row.condition)}>
                    {pretty(row.condition)} - {pct(row.score)}
                    <span className='ml-2 rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-500'>{(row.source || []).join(' + ')}</span>
                  </li>
                ))}
              </ul>
            </div>
            {assessment.inputs?.symptom && (
              <div><p className='font-semibold text-slate-700'>Symptom evidence used</p>
                <p className='mt-1 text-slate-600'>{pretty(assessment.inputs.symptom.condition)} ({pretty(assessment.inputs.symptom.confidenceLevel)})</p></div>
            )}
            {assessment.inputs?.image && (
              <div><p className='font-semibold text-slate-700'>Image evidence used</p>
                <p className='mt-1 text-slate-600'>{pretty(assessment.inputs.image.predictedClass)} ({pretty(assessment.inputs.image.band)})</p></div>
            )}
            {assessment.inputs?.history && (
              <div className='md:col-span-2'><p className='font-semibold text-slate-700'>History context used</p>
                <p className='mt-1 text-slate-600'>Species: {pretty(assessment.inputs.history.species ?? 'n/a')} - prior reports referenced: {assessment.inputs.history.priorConditionCount}</p></div>
            )}
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
          {assessment.narrative && <p className='mt-3 text-xs italic text-slate-500'>{assessment.narrative}</p>}
          {result.disclaimer && <p className='mt-1 text-xs italic text-slate-500'>{result.disclaimer}</p>}
        </div>
      )}

      {savedReportId && (
        <div role='status' className='mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
          <p className='font-semibold'>Saved to AI Health Reports history.</p>
          <p className='mt-1 text-xs font-normal'>Report ID: {savedReportId}. It appears in the history below and awaits veterinarian review (pending).</p>
        </div>
      )}
    </div>
  )
}

export default CombinedAssessment
