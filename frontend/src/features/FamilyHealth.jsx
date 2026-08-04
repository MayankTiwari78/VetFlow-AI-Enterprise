import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { isAuthSessionHandledError } from '../api/authClient'
import { AppContext } from '../context/AppContext'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const emptyDraft = { name: '', relationship: '', dob: '', phone: '', email: '', emergencyContact: false }

const FamilyHealth = () => {
  const { authStatus, backendUrl, token } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })
  const [members, setMembers] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMembers = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/family-members`, { headers: { token } })
      setMembers(data.members || data.data?.members || [])
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) setError(requestError.response?.data?.message || 'Family health is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadMembers() }, [token])

  const save = async (event) => {
    event.preventDefault()
    try {
      await axios.post(`${backendUrl}/api/user/family-members`, draft, { headers: { token } })
      setDraft(emptyDraft)
      toast.success('Family member saved')
      await loadMembers()
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || 'Unable to save family member')
    }
  }

  const remove = async (memberId) => {
    try {
      await axios.delete(`${backendUrl}/api/user/family-members/${memberId}`, { headers: { token } })
      toast.success('Family member removed')
      await loadMembers()
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) toast.error(requestError.response?.data?.message || 'Unable to remove family member')
    }
  }

  if (authStatus === 'initializing' || loading) return <main className='space-y-5 py-10'><div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='h-96 animate-pulse rounded-lg bg-white' /></main>
  if (!token) return <main className='py-10' />
  if (error) return <main className='py-14'><section className='mf-card mx-auto max-w-2xl p-10 text-center'><p className='mf-eyebrow'>Family health</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Family section unavailable</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button type='button' className='mf-button mt-6' onClick={loadMembers}>Retry</button></section></main>

  return (
    <main className='py-10'>
      <section className='mb-7 border-b border-line pb-7'><p className='mf-eyebrow'>Consent-based family health</p><h1 className='mf-title'>Family health</h1><p className='mf-copy'>Add non-linked dependent/contact profiles. Listing an adult family member here does not grant access to that person&apos;s medical records.</p></section>
      <section className='grid gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
        <form className='mf-card space-y-4 p-6' onSubmit={save}>
          <p className='mf-eyebrow'>Add family member</p>
          <label className='mf-label'>Name<input className='mf-field' value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
          <label className='mf-label'>Relationship<input className='mf-field' value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })} required /></label>
          <label className='mf-label'>Date of birth<input className='mf-field' type='date' value={draft.dob} onChange={(event) => setDraft({ ...draft, dob: event.target.value })} required /></label>
          <label className='mf-label'>Phone<input className='mf-field' value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
          <label className='mf-label'>Email<input className='mf-field' type='email' value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
          <label className='flex items-center gap-3 text-sm font-semibold text-ink'><input type='checkbox' checked={draft.emergencyContact} onChange={(event) => setDraft({ ...draft, emergencyContact: event.target.checked })} /> Emergency contact</label>
          <button className='mf-button' type='submit'>Save member</button>
        </form>
        <div className='space-y-3'>
          {members.map((member) => <article className='mf-card p-5' key={member._id}><div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-start'><div><p className='mf-eyebrow'>{member.relationship}</p><h2 className='mt-1 text-lg font-semibold text-ink'>{member.name}</h2><p className='mt-2 text-sm text-slate-600'>{member.dob}</p><p className='mt-1 text-sm text-slate-600'>{member.phone || 'No phone added'} {member.email ? `- ${member.email}` : ''}</p><p className='mt-3 text-xs text-slate-500'>{member.consentScope}</p></div><button type='button' className='mf-button-secondary' onClick={() => remove(member._id)}>Remove</button></div></article>)}
          {members.length === 0 && <div className='mf-card p-10 text-center text-sm text-slate-500'>No family members have been added.</div>}
        </div>
      </section>
    </main>
  )
}

export default FamilyHealth
