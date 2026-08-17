import axios from 'axios'
import { useState } from 'react'
import { toast } from 'react-toastify'

import { isAuthSessionHandledError } from '../../api/authClient'

const SYMPTOMS = ['Fever', 'Cough', 'Diarrhea', 'Lethargy', 'Loss_of_Appetite']
const empty = () => ({ Fever: 0, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 })
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const AiSymptomForm = ({ backendUrl, token, petId, onReportSaved }) => {
  const [symptoms, setSymptoms] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState('')

  const run = async (save) => {
    if (!petId) { setError('Please select a pet first.'); return }
    setLoading(true); setError('')
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/${save ? 'predict-and-save' : 'predict'}`,
        { petId, symptoms }, auth(token)
      )
      if (save) { toast.success('Preliminary AI assessment report saved'); setPrediction(null); onReportSaved?.() }
      else setPrediction(data?.data?.prediction ?? null)
    } catch (e) {
      if (!isAuthSessionHandledError(e)) setError(e.response?.data?.message || e.message || 'AI prediction failed')
    } finally { setLoading(false) }
  }

  return (
    <div className='mf-card p-5'>
      <h3 className='text-lg font-semibold text-ink'>AI Preliminary Assessment</h3>
      <p className='mt-1 text-sm text-slate-600'>Enter symptom severity (0 = none, 3 = severe). This is a preliminary AI assessment, not a diagnosis.</p>
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
      <div className='mt-4 flex flex-wrap gap-3'>
        <button className='mf-button' disabled={loading} type='button' onClick={() => run(false)}>{loading ? 'Running...' : 'Run AI Assessment'}</button>
        <button className='mf-button-secondary' disabled={loading} type='button' onClick={() => run(true)}>{loading ? 'Saving...' : 'Run & Save Report'}</button>
      </div>
      {prediction && (
        <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
          <p className='text-sm font-semibold text-amber-800'>This AI Report is a Preliminary Assessment and must not be considered a diagnosis.</p>
          <div className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
            <div><p className='font-semibold text-slate-700'>Predicted condition</p><p className='mt-1 text-slate-600'>{prediction.predictedCondition}</p></div>
            <div><p className='font-semibold text-slate-700'>Confidence</p><p className='mt-1 text-slate-600'>{prediction.confidenceLevel} ({Math.round(prediction.modelProbability * 100)}%)</p></div>
            <div className='md:col-span-2'><p className='font-semibold text-slate-700'>Top possibilities</p>
              <ul className='mt-1 space-y-1 text-slate-600'>{prediction.topPredictions?.map((i) => <li key={i.condition}>{i.condition} — {Math.round(i.probability * 100)}%</li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiSymptomForm