import axios from 'axios'
import { useEffect, useRef, useState } from 'react'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Mirrors the backend Stage 2C head-selection policy.
const SPECIES_SUPPORT = {
  dog: { supported: true, label: 'dog dermatology model' },
  dogs: { supported: true, label: 'dog dermatology model' },
  canine: { supported: true, label: 'dog dermatology model' },
  puppy: { supported: true, label: 'dog dermatology model' },
  cat: { supported: true, label: 'cat dermatology model' },
  cats: { supported: true, label: 'cat dermatology model' },
  feline: { supported: true, label: 'cat dermatology model' },
  kitten: { supported: true, label: 'cat dermatology model' },
  cattle: { supported: true, label: 'cattle lumpy skin disease model' },
  cow: { supported: true, label: 'cattle lumpy skin disease model' },
  cows: { supported: true, label: 'cattle lumpy skin disease model' },
  bovine: { supported: true, label: 'cattle lumpy skin disease model' }
}

const speciesSupportFor = (species) => {
  if (!species) return null
  return SPECIES_SUPPORT[String(species).trim().toLowerCase()] ?? null
}

const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`

/**
 * Stage 2C AI Image Assessment — preliminary image screening only.
 * Adds an upload/preview/predict section next to the existing symptom form;
 * the symptom-based flow is untouched.
 */
const AiImageAssessment = ({ backendUrl, token, pet }) => {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const support = pet ? speciesSupportFor(pet.species) : null

  // Revoke object URLs so previews never leak.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const selectFile = (event) => {
    setError('')
    setResult(null)
    const selected = event.target.files?.[0] ?? null

    if (!selected) {
      setFile(null)
      setPreviewUrl('')
      return
    }

    if (!ACCEPTED_MIME_TYPES.includes(selected.type)) {
      setError('Unsupported file type. Please choose a JPG, PNG or WEBP photo of the affected skin area.')
      event.target.value = ''
      return
    }

    if (selected.size > MAX_SIZE_BYTES) {
      setError('Image is too large. Maximum size is 5 MB.')
      event.target.value = ''
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const runAssessment = async () => {
    if (!pet?.id) { setError('Please select a pet first.'); return }
    if (!file) { setError('Please choose an image first.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const formData = new FormData()
      formData.append('petId', pet.id)
      formData.append('image', file)

      const { data } = await axios.post(
        `${backendUrl}/api/v1/veterinary/ai-ml/predict-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 180000
        }
      )
      const prediction = data?.data?.prediction ?? null
      if (!prediction?.modelModality || prediction.modelModality !== 'image') {
        throw new Error('Unexpected AI image assessment response')
      }
      setResult(prediction)
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.message ||
          'AI image assessment failed. Please try again later.'
      )
    } finally { setLoading(false) }
  }

  const findings = result?.imageFindings
  const confidence = result?.imageConfidence
  const bandColor =
    confidence?.band === 'High' ? 'text-emerald-700' :
    confidence?.band === 'Moderate' ? 'text-amber-700' : 'text-slate-600'

  return (
    <div className='mf-card p-5'>
      <h3 className='text-lg font-semibold text-ink'>AI Image Assessment</h3>
      <p className='mt-1 text-sm text-slate-600'>
        Upload a clear photo of your pet&rsquo;s affected skin area for a preliminary AI screening
        with our veterinary computer-vision models. This is not a diagnosis.
      </p>

      {!pet && (
        <div role='note' className='mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
          Please select a pet first.
        </div>
      )}

      {pet && !support && (
        <div role='note' className='mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
          {pet.species
            ? `AI image assessment is unavailable for species "${pet.species}". It is currently available for dogs, cats and cattle only.`
            : 'AI image assessment is unavailable because no species is recorded for this pet.'}
        </div>
      )}

      {error && <div role='alert' className='mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}

      {support && (
        <>
          <div className='mt-4 grid gap-4 md:grid-cols-[220px_1fr]'>
            <div>
              {previewUrl ? (
                <img src={previewUrl} alt='Selected skin image preview' className='aspect-square w-full rounded-lg border border-line/70 object-cover' />
              ) : (
                <div className='flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-line/70 bg-[#E7F4F5] text-xs text-slate-500'>Image preview</div>
              )}
            </div>
            <div className='space-y-3'>
              <label className='mf-label'>
                Skin / dermatology image (JPG, PNG or WEBP up to 5&nbsp;MB)
                <input
                  ref={inputRef}
                  type='file'
                  accept={ACCEPTED_MIME_TYPES.join(',')}
                  onChange={selectFile}
                  disabled={loading}
                  className='mf-field mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-teal/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal'
                />
              </label>
              {file && <p className='text-xs text-muted'>Selected: {file.name} ({Math.round(file.size / 1024)} KB)</p>}
              <div className='flex flex-wrap gap-3'>
                <button className='mf-button' type='button' disabled={loading || !file} onClick={runAssessment}>
                  {loading ? 'Analysing image...' : 'Run AI Image Assessment'}
                </button>
                {file && (
                  <button className='mf-button-secondary' type='button' disabled={loading} onClick={clearSelection}>Clear selection</button>
                )}
              </div>
            </div>
          </div>

          {loading && (
            <div className='mt-4 flex items-center gap-3 rounded-md border border-line/70 bg-white px-4 py-3 text-sm text-muted'>
              <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent' aria-hidden='true' />
              Analysing the image with the veterinary computer-vision model...
            </div>
          )}

          {result && findings && confidence && (
            <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
              <p className='text-sm font-semibold text-amber-800'>
                This AI Report is a Preliminary Assessment and must not be considered a diagnosis.
                Veterinarian review is required.
              </p>
              <div className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
                <div>
                  <p className='font-semibold text-slate-700'>Predicted condition</p>
                  <p className='mt-1 text-slate-600'>{String(findings.predicted_class ?? '').replace(/_/g, ' ') || 'Unknown'}</p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>Model confidence</p>
                  <p className={`mt-1 font-semibold ${bandColor}`}>
                    {confidence.band} ({formatPercent(confidence.probability)})
                  </p>
                </div>
                <div className='md:col-span-2'>
                  <p className='font-semibold text-slate-700'>Top conditions</p>
                  <ul className='mt-1 space-y-1 text-slate-600'>
                    {findings.top_conditions?.map((item) => (
                      <li key={item.class}>{String(item.class).replace(/_/g, ' ')} — {formatPercent(item.probability)}</li>
                    ))}
                  </ul>
                </div>
                <div className='md:col-span-2'>
                  <p className='font-semibold text-slate-700'>Model information</p>
                  <p className='mt-1 text-slate-600'>
                    {findings.model_version} · backbone: {findings.backbone} · mode: {findings.mode}
                    {typeof findings.temperature === 'number' ? ` · calibrated (T=${findings.temperature.toFixed(2)})` : ''}
                  </p>
                </div>
              </div>
              <details className='mt-3 text-xs text-slate-600'>
                <summary className='cursor-pointer font-semibold text-slate-700'>Full probability breakdown</summary>
                <ul className='mt-2 space-y-1'>
                  {Object.entries(findings.probabilities ?? {}).map(([label, value]) => (
                    <li key={label}>{String(label).replace(/_/g, ' ')} — {formatPercent(value)}</li>
                  ))}
                </ul>
              </details>
              {result.disclaimer && <p className='mt-3 text-xs italic text-slate-500'>{result.disclaimer}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AiImageAssessment