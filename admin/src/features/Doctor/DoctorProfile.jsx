import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const weekDays = [
    ['0', 'Sunday'],
    ['1', 'Monday'],
    ['2', 'Tuesday'],
    ['3', 'Wednesday'],
    ['4', 'Thursday'],
    ['5', 'Friday'],
    ['6', 'Saturday']
]

const emptyAvailability = {
    enabled: true,
    timezone: 'Asia/Kolkata',
    consultationDurationMinutes: 30,
    weeklySchedule: []
}

const listToText = (slots = []) => slots.join(', ')
const textToList = (value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]

const DoctorProfile = () => {

    const { dToken, profileData, setProfileData, getProfileData } = useContext(DoctorContext)
    const { currency, backendUrl } = useContext(AppContext)
    const [isEdit, setIsEdit] = useState(false)
    const [availability, setAvailability] = useState(emptyAvailability)
    const [availabilityDraft, setAvailabilityDraft] = useState(emptyAvailability)
    const [availabilityError, setAvailabilityError] = useState('')
    const [savingAvailability, setSavingAvailability] = useState(false)

    const updateProfile = async () => {

        try {

            const updateData = {
                address: profileData.address,
                fees: profileData.fees,
                about: profileData.about,
                available: profileData.available
            }

            const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } })

            if (data.success) {
                toast.success(data.message)
                setIsEdit(false)
                getProfileData()
            } else {
                toast.error(data.message)
            }

            setIsEdit(false)

        } catch (error) {
            toast.error(error.message)
        }

    }

    const loadAvailability = async () => {
        if (!dToken) return

        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/availability`, { headers: { dToken } })
            const next = { ...emptyAvailability, ...data.availability }
            setAvailability(next)
            setAvailabilityDraft(next)
        } catch (error) {
            setAvailabilityError(error.response?.data?.message || 'Unable to load weekly availability')
        }
    }

    const updateDaySlots = (dayOfWeek, value) => {
        const slots = textToList(value)
        setAvailabilityDraft((current) => {
            const withoutDay = current.weeklySchedule.filter((item) => item.dayOfWeek !== Number(dayOfWeek))
            return {
                ...current,
                weeklySchedule: [...withoutDay, { dayOfWeek: Number(dayOfWeek), slots }]
                    .filter((item) => item.slots.length > 0)
                    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
            }
        })
    }

    const saveAvailability = async () => {
        setSavingAvailability(true)
        setAvailabilityError('')

        try {
            const { data } = await axios.put(`${backendUrl}/api/doctor/availability`, availabilityDraft, { headers: { dToken } })
            const next = { ...emptyAvailability, ...data.availability }
            setAvailability(next)
            setAvailabilityDraft(next)
            setProfileData((current) => current ? { ...current, available: next.enabled, availability: next } : current)
            toast.success('Weekly availability saved')
        } catch (error) {
            setAvailabilityError(error.response?.data?.message || 'Unable to save weekly availability')
        } finally {
            setSavingAvailability(false)
        }
    }

    useEffect(() => {
        if (dToken) {
            getProfileData()
            loadAvailability()
        }
    }, [dToken])

    return profileData && (
        <main className='portal-page'>
            <div><p className='portal-eyebrow'>Clinical identity</p><h1 className='portal-title'>Professional profile</h1><p className='mt-2 text-slate-600'>Maintain the information patients see when reviewing availability.</p></div>
            <div className='grid gap-5 lg:grid-cols-[260px_1fr]'>
                <div>
                    <img className='portal-card h-72 w-full bg-[#E7F4F5] object-cover object-top' src={profileData.image} alt={profileData.name} />
                </div>

                <div className='portal-card flex-1 p-6 sm:p-8'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <p className='flex items-center gap-2 text-3xl font-semibold text-ink'>{profileData.name}</p>
                    <div className='flex flex-wrap items-center gap-2 mt-2 text-slate-600'>
                        <p>{profileData.degree} - {profileData.speciality}</p>
                        <span className='portal-status bg-[#E7F4F5] text-primary'>{profileData.experience}</span>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='mt-6 text-sm font-semibold text-ink'>Professional summary</p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>
                            {
                                isEdit
                                    ? <textarea onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))} className='portal-field mt-2' rows={8} value={profileData.about} />
                                    : profileData.about
                            }
                        </p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>
                        Appointment fee: <span className='text-ink'>{currency} {isEdit ? <input className='portal-field ml-2 inline-block w-32' type='number' onChange={(e) => setProfileData(prev => ({ ...prev, fees: e.target.value }))} value={profileData.fees} /> : profileData.fees}</span>
                    </p>

                    <div className='flex gap-2 py-2'>
                        <p>Address:</p>
                        <p className='text-sm'>
                            {isEdit ? <input className='portal-field' type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={profileData.address.line1} /> : profileData.address.line1}
                            <br />
                            {isEdit ? <input className='portal-field mt-2' type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={profileData.address.line2} /> : profileData.address.line2}
                        </p>
                    </div>

                    <div className='flex gap-1 pt-2'>
                        <input type="checkbox" className='h-4 w-4 accent-[#0F6F85]' onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))} checked={profileData.available} />
                        <span className={`portal-status ${profileData.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{profileData.available ? 'Available for booking' : 'Unavailable'}</span>
                    </div>

                    {
                        isEdit
                            ? <button onClick={updateProfile} className='portal-button mt-5'>Save profile</button>
                            : <button onClick={() => setIsEdit(prev => !prev)} className='portal-button-secondary mt-5'>Edit profile</button>
                    }

                </div>
            </div>

            <section className='portal-card p-6'>
                <div className='flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-start'>
                    <div><p className='portal-eyebrow'>Weekly schedule</p><h2 className='text-xl font-semibold text-ink'>Availability</h2><p className='mt-1 text-sm text-slate-600'>Publish bookable local slots from the server-side schedule.</p></div>
                    <label className='flex items-center gap-2 text-sm font-semibold text-slate-600'>
                        <input type='checkbox' className='h-4 w-4 accent-[#0F6F85]' checked={availabilityDraft.enabled} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, enabled: event.target.checked }))} />
                        Accepting appointments
                    </label>
                </div>
                {availabilityError && <div role='alert' className='mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{availabilityError}</div>}
                <div className='mt-5 grid gap-4 sm:grid-cols-2'>
                    <label className='portal-label'>Timezone<input className='portal-field' value={availabilityDraft.timezone} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, timezone: event.target.value }))} /></label>
                    <label className='portal-label'>Consultation duration<input className='portal-field' type='number' min='15' max='120' value={availabilityDraft.consultationDurationMinutes} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, consultationDurationMinutes: Number(event.target.value) }))} /></label>
                </div>
                <div className='mt-5 grid gap-3 lg:grid-cols-2'>
                    {weekDays.map(([dayValue, dayLabel]) => {
                        const day = availabilityDraft.weeklySchedule.find((item) => item.dayOfWeek === Number(dayValue))
                        return <label className='portal-label' key={dayValue}>{dayLabel}<input className='portal-field' placeholder='10:00, 10:30, 14:00' value={listToText(day?.slots)} onChange={(event) => updateDaySlots(dayValue, event.target.value)} /></label>
                    })}
                </div>
                <div className='mt-5 flex flex-wrap items-center gap-3'>
                    <button type='button' className='portal-button' disabled={savingAvailability} onClick={saveAvailability}>{savingAvailability ? 'Saving...' : 'Save availability'}</button>
                    <button type='button' className='portal-button-secondary' disabled={savingAvailability} onClick={() => { setAvailabilityDraft(availability); setAvailabilityError('') }}>Reset</button>
                </div>
            </section>
        </main>
    )
}

export default DoctorProfile
