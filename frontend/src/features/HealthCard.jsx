import axios from 'axios'
import { useContext, useEffect, useState } from 'react'

import { isAuthSessionHandledError } from '../api/authClient'
import { AppContext } from '../context/AppContext'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const HealthCard = () => {
  const { authStatus, backendUrl, token } = useContext(AppContext)
  useProtectedPatientRoute({ authStatus, token })
  const [card, setCard] = useState(null)
  const [lookup, setLookup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCard = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/health-card`, { headers: { token } })
      setCard(data.card || data.data?.card)
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) setError(requestError.response?.data?.message || 'Health card is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadCard() }, [token])

  const verify = async () => {
    if (!card?.lookupId) return
    const { data } = await axios.get(`${backendUrl}/api/user/health-card/lookup/${card.lookupId}`, { headers: { token } })
    setLookup(data.status || data.data?.status)
  }

  if (authStatus === 'initializing' || loading) return <main className='space-y-5 py-10'><div className='h-28 animate-pulse rounded-lg bg-[#E7F4F5]' /><div className='h-96 animate-pulse rounded-lg bg-white' /></main>
  if (!token) return <main className='py-10' />
  if (error) return <main className='py-14'><section className='mf-card mx-auto max-w-2xl p-10 text-center'><p className='mf-eyebrow'>Secure health card</p><h1 className='mt-2 text-2xl font-semibold text-ink'>Health card unavailable</h1><p className='mt-3 text-sm text-slate-600'>{error}</p><button type='button' className='mf-button mt-6' onClick={loadCard}>Retry</button></section></main>

  return (
    <main className='py-10'>
      <section className='mb-7 border-b border-line pb-7'><p className='mf-eyebrow'>Safe identity summary</p><h1 className='mf-title'>Health card</h1><p className='mf-copy'>The QR code contains only an opaque lookup identifier. It does not include medical details, JWTs, email, phone, or raw database IDs.</p></section>
      <section className='grid gap-5 lg:grid-cols-[1fr_0.8fr]'>
        <article className='mf-card p-6 print:border print:shadow-none'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-4'><img className='h-16 w-16 rounded-full border border-line object-cover' src={card?.patient?.image} alt='' /><div><p className='mf-eyebrow'>VetFlow health card</p><h2 className='text-2xl font-semibold text-ink'>{card?.patient?.name}</h2><p className='text-sm text-slate-500'>{card?.cardId}</p></div></div>
            {card?.qrDataUrl && <img className='h-32 w-32 rounded-md border border-line bg-white p-2' src={card.qrDataUrl} alt='Health card QR code' />}
          </div>
          <dl className='mt-8 grid gap-4 text-sm sm:grid-cols-3'>
            <div><dt className='text-slate-500'>Blood group</dt><dd className='mt-1 font-semibold text-ink'>{card?.patient?.bloodGroup || 'Not known'}</dd></div>
            <div><dt className='text-slate-500'>Emergency contact</dt><dd className='mt-1 font-semibold text-ink'>{card?.patient?.emergencyContact?.name || 'Not added'}</dd></div>
            <div><dt className='text-slate-500'>Relationship</dt><dd className='mt-1 font-semibold text-ink'>{card?.patient?.emergencyContact?.relationship || 'Not added'}</dd></div>
          </dl>
          <div className='mt-6 flex flex-wrap gap-3 print:hidden'><button type='button' className='mf-button' onClick={() => window.print()}>Print card</button><button type='button' className='mf-button-secondary' onClick={verify}>Verify QR lookup</button></div>
        </article>
        <aside className='mf-card p-6 text-sm text-slate-600'><p className='mf-eyebrow'>Verification status</p><p className='mt-3 leading-6'>{lookup ? lookup.message : 'Run lookup to confirm the QR resolves only to a minimal non-sensitive status.'}</p>{lookup && <p className='mt-4 font-semibold text-ink'>{lookup.cardId} - {lookup.status}</p>}</aside>
      </section>
    </main>
  )
}

export default HealthCard
