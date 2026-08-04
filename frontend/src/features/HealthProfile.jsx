import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

import { AppContext } from '../context/AppContext'
import { isAuthSessionHandledError } from '../api/authClient'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const emptyProfile = {
  dob: '',
  gender: 'Not Selected',
  bloodGroup: 'Not known',
  allergies: [],
  chronicConditions: [],
  medicalNotes: '',
  emergencyContact: { name: '', relationship: '', phone: '' },
  insurance: { provider: '', policyNumber: '', expiryDate: '' }
}

const listText = (items) => items.join(', ')
const parseList = (value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]

const HealthProfile = () => {
  const { authStatus, backendUrl, token } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })
  const [profile, setProfile] = useState(emptyProfile)
  const [draft, setDraft] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')

  const loadProfile = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/health-profile`, { headers: { token } })
      const next = { ...emptyProfile, ...data.healthProfile }
      setProfile(next)
      setDraft(next)
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || 'Your health profile is temporarily unavailable.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [token])

  const completeness = useMemo(() => {
    const checks = [profile.dob, profile.gender !== 'Not Selected', profile.bloodGroup !== 'Not known', profile.emergencyContact?.name, profile.emergencyContact?.phone]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [profile])

  const updateNested = (section, field, value) => {
    setDraft((current) => ({ ...current, [section]: { ...current[section], [field]: value } }))
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setValidationError('')
    if (!draft.dob) {
      setValidationError('Add your date of birth before saving.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...draft,
        allergies: Array.isArray(draft.allergies) ? draft.allergies : parseList(draft.allergies),
        chronicConditions: Array.isArray(draft.chronicConditions) ? draft.chronicConditions : parseList(draft.chronicConditions)
      }
      const { data } = await axios.put(`${backendUrl}/api/user/health-profile`, payload, { headers: { token } })
      const next = { ...emptyProfile, ...data.healthProfile }
      setProfile(next)
      setDraft(next)
      setEditing(false)
      toast.success('Health profile saved securely')
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setValidationError(requestError.response?.data?.message || 'We could not save your health profile. Review the fields and try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'initializing') return <div className='space-y-5 py-10'><div className='h-32 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='grid gap-5 lg:grid-cols-2'><div className='h-80 animate-pulse rounded-lg bg-white' /><div className='h-80 animate-pulse rounded-lg bg-white' /></div></div>
  if (!token) return <div className='space-y-5 py-10'><div className='h-32 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='grid gap-5 lg:grid-cols-2'><div className='h-80 animate-pulse rounded-lg bg-white' /><div className='h-80 animate-pulse rounded-lg bg-white' /></div></div>
  if (loading) return <div className='space-y-5 py-10'><div className='h-32 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='grid gap-5 lg:grid-cols-2'><div className='h-80 animate-pulse rounded-lg bg-white' /><div className='h-80 animate-pulse rounded-lg bg-white' /></div></div>
  if (error) return <section className='py-14'><div className='mf-card mx-auto max-w-2xl p-10 text-center'><p className='mf-eyebrow'>Protected health record</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Your profile could not be loaded</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button type='button' className='mf-button mt-6' onClick={loadProfile}>Try again</button></div></section>

  return (
    <main className='py-10'>
      <section className='mb-7 flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end'>
        <div><p className='mf-eyebrow'>Private patient record</p><h1 className='mf-title'>Health profile</h1><p className='mf-copy'>Keep essential health, emergency, and insurance details ready for authorized care teams.</p></div>
        <div className='min-w-52'><div className='flex items-center justify-between text-xs font-semibold text-slate-600'><span>Profile readiness</span><span>{completeness}%</span></div><div className='mt-2 h-2 overflow-hidden rounded-full bg-[#DCEBED]'><div className='h-full rounded-full bg-teal transition-all' style={{ width: `${completeness}%` }} /></div></div>
      </section>

      {!editing ? (
        <div className='space-y-5'>
          <section className='grid gap-5 lg:grid-cols-3'>
            <article className='mf-card p-6'><p className='mf-eyebrow'>Identity</p><dl className='mt-5 space-y-4 text-sm'><div><dt className='text-slate-500'>Date of birth</dt><dd className='mt-1 font-semibold text-ink'>{profile.dob || 'Not added'}</dd></div><div><dt className='text-slate-500'>Gender</dt><dd className='mt-1 font-semibold text-ink'>{profile.gender}</dd></div><div><dt className='text-slate-500'>Blood group</dt><dd className='mt-1 font-semibold text-ink'>{profile.bloodGroup}</dd></div></dl></article>
            <article className='mf-card p-6'><p className='mf-eyebrow'>Health overview</p><div className='mt-5 space-y-5 text-sm'><div><p className='text-slate-500'>Allergies</p><p className='mt-1 font-medium text-ink'>{profile.allergies.length ? listText(profile.allergies) : 'None recorded'}</p></div><div><p className='text-slate-500'>Chronic conditions</p><p className='mt-1 font-medium text-ink'>{profile.chronicConditions.length ? listText(profile.chronicConditions) : 'None recorded'}</p></div></div></article>
            <article className='mf-card p-6'><p className='mf-eyebrow'>Emergency contact</p><div className='mt-5 space-y-2 text-sm'><p className='font-semibold text-ink'>{profile.emergencyContact.name || 'Not added'}</p><p className='text-slate-600'>{profile.emergencyContact.relationship || 'Relationship not added'}</p><p className='text-primary'>{profile.emergencyContact.phone || 'Phone not added'}</p></div></article>
          </section>
          <section className='grid gap-5 lg:grid-cols-[1.25fr_1fr]'>
            <article className='mf-card p-6'><p className='mf-eyebrow'>Notes for care teams</p><p className='mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600'>{profile.medicalNotes || 'No patient-provided medical notes yet.'}</p></article>
            <article className='mf-card p-6'><p className='mf-eyebrow'>Insurance</p><dl className='mt-4 grid grid-cols-2 gap-4 text-sm'><div><dt className='text-slate-500'>Provider</dt><dd className='mt-1 font-semibold text-ink'>{profile.insurance.provider || 'Not added'}</dd></div><div><dt className='text-slate-500'>Policy number</dt><dd className='mt-1 font-semibold text-ink'>{profile.insurance.policyNumber || 'Not added'}</dd></div><div><dt className='text-slate-500'>Expiry</dt><dd className='mt-1 font-semibold text-ink'>{profile.insurance.expiryDate || 'Not added'}</dd></div></dl></article>
          </section>
          <button type='button' className='mf-button' onClick={() => { setDraft(profile); setEditing(true) }}>Edit health profile</button>
        </div>
      ) : (
        <form className='space-y-5' onSubmit={saveProfile}>
          {validationError && <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{validationError}</div>}
          <section className='mf-card grid gap-5 p-6 sm:grid-cols-3'><label className='mf-label'>Date of birth<input className='mf-field' type='date' required value={draft.dob} onChange={(event) => setDraft({ ...draft, dob: event.target.value })} /></label><label className='mf-label'>Gender<select className='mf-field' value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option>Not Selected</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label className='mf-label'>Blood group<select className='mf-field' value={draft.bloodGroup} onChange={(event) => setDraft({ ...draft, bloodGroup: event.target.value })}>{['Not known','A+','A-','B+','B-','AB+','AB-','O+','O-'].map((group) => <option key={group}>{group}</option>)}</select></label></section>
          <section className='mf-card grid gap-5 p-6 lg:grid-cols-2'><label className='mf-label'>Allergies<span className='block text-xs font-normal text-slate-500'>Separate multiple items with commas.</span><input className='mf-field' value={Array.isArray(draft.allergies) ? listText(draft.allergies) : draft.allergies} onChange={(event) => setDraft({ ...draft, allergies: event.target.value })} placeholder='For example: penicillin, pollen' /></label><label className='mf-label'>Chronic conditions<span className='block text-xs font-normal text-slate-500'>Separate multiple items with commas.</span><input className='mf-field' value={Array.isArray(draft.chronicConditions) ? listText(draft.chronicConditions) : draft.chronicConditions} onChange={(event) => setDraft({ ...draft, chronicConditions: event.target.value })} placeholder='For example: asthma' /></label><label className='mf-label lg:col-span-2'>Patient-provided medical notes<textarea className='mf-field min-h-28 resize-y' maxLength={2000} value={draft.medicalNotes} onChange={(event) => setDraft({ ...draft, medicalNotes: event.target.value })} placeholder='Share context that may help an authorized care team.' /></label></section>
          <section className='grid gap-5 lg:grid-cols-2'><div className='mf-card grid gap-4 p-6'><p className='mf-eyebrow'>Emergency contact</p><label className='mf-label'>Name<input className='mf-field' value={draft.emergencyContact.name} onChange={(event) => updateNested('emergencyContact', 'name', event.target.value)} /></label><label className='mf-label'>Relationship<input className='mf-field' value={draft.emergencyContact.relationship} onChange={(event) => updateNested('emergencyContact', 'relationship', event.target.value)} /></label><label className='mf-label'>Phone<input className='mf-field' type='tel' value={draft.emergencyContact.phone} onChange={(event) => updateNested('emergencyContact', 'phone', event.target.value)} /></label></div><div className='mf-card grid gap-4 p-6'><p className='mf-eyebrow'>Insurance</p><label className='mf-label'>Provider<input className='mf-field' value={draft.insurance.provider} onChange={(event) => updateNested('insurance', 'provider', event.target.value)} /></label><label className='mf-label'>Policy number<input className='mf-field' value={draft.insurance.policyNumber} onChange={(event) => updateNested('insurance', 'policyNumber', event.target.value)} /></label><label className='mf-label'>Expiry date<input className='mf-field' type='date' value={draft.insurance.expiryDate} onChange={(event) => updateNested('insurance', 'expiryDate', event.target.value)} /></label></div></section>
          <div className='flex flex-wrap gap-3'><button className='mf-button' type='submit' disabled={saving}>{saving ? 'Saving securely...' : 'Save health profile'}</button><button className='mf-button-secondary' type='button' disabled={saving} onClick={() => { setEditing(false); setDraft(profile); setValidationError('') }}>Cancel</button></div>
        </form>
      )}
    </main>
  )
}

export default HealthProfile
