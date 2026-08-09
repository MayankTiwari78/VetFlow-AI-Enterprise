import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'
import { isAuthSessionHandledError } from '../api/authClient'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'
import { loginHrefForReturnTo } from '../lib/authNavigation'

const Appointment = () => {

    const { docId } = useParams()
    const { authStatus, doctors, doctorsLoading, doctorsError, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    useProtectedPatientRoute({ authStatus, token })

    const [docInfo, setDocInfo] = useState(false)
    const [docSlots, setDocSlots] = useState([])
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotsError, setSlotsError] = useState('')

    const navigate = useNavigate()

    const fetchDocInfo = async () => {
        const docInfo = doctors.find((doc) => doc._id === docId)
        setDocInfo(docInfo)
    }

    const formatSlotDate = (slotDate) => {
        const date = new Date(`${slotDate}T12:00:00`)
        return Number.isNaN(date.getTime()) ? slotDate : date
    }

    const getAvailableSlots = async () => {
        setDocSlots([])
        setSlotIndex(0)
        setSlotTime('')
        setSlotsLoading(true)
        setSlotsError('')

        try {
            const today = new Date().toISOString().slice(0, 10)
            const { data } = await axios.get(`${backendUrl}/api/doctor/${docId}/available-slots`, { params: { from: today, days: 7 } })
            const days = data.availability?.days || []
            setDocSlots(days.map((day) => ({
                date: day.date,
                datetime: formatSlotDate(day.date),
                slots: day.slots.map((time) => ({ date: day.date, time }))
            })))
        } catch (error) {
            setSlotsError(error.response?.data?.message || 'Available appointment times could not be loaded.')
        } finally {
            setSlotsLoading(false)
        }
    }

    const bookAppointment = async () => {

        if (authStatus === 'initializing') {
            return
        }

        if (!token) {
            toast.warning('Login to book appointment')
            return navigate(loginHrefForReturnTo(`/appointment/${docId}`))
        }

        const selectedDay = docSlots[slotIndex]
        const slotDate = selectedDay?.date

        if (!slotDate || !slotTime) {
            toast.warning('Choose an available appointment time')
            return
        }

        try {

            const { data } = await axios.post(backendUrl + '/api/user/book-appointment', { docId, slotDate, slotTime }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                getDoctosData()
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            if (!isAuthSessionHandledError(error)) {
                toast.error(error.message)
            }
        }

    }

    useEffect(() => {
        if (doctors.length > 0) {
            fetchDocInfo()
        }
    }, [doctors, docId])

    useEffect(() => {
        if (docInfo) {
            getAvailableSlots()
        }
    }, [docInfo])

    if (doctorsLoading || authStatus === 'initializing' || !token) {
        return <div className='py-12'><div className='mf-card h-96 animate-pulse bg-[#EAF3F4]' /></div>
    }

    if (!docInfo) {
        return <section className='min-h-[60vh] py-14'>
            <div className='mx-auto max-w-2xl border-y border-line bg-white px-6 py-12 text-center'>
                <p className='mf-eyebrow'>Veterinarian profile</p>
                <h1 className='mt-2 text-3xl font-semibold text-ink'>This booking profile is unavailable</h1>
                <p className='mt-3 text-sm leading-6 text-slate-600'>{doctorsError || 'The veterinarian may no longer be accepting appointments, or the link may be out of date.'}</p>
                <button type='button' onClick={() => navigate('/doctors')} className='mf-button mt-6'>Browse veterinarians</button>
            </div>
        </section>
    }

    return (
        <section className='py-10'>

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-[#E7F4F5] w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt={docInfo.name} />
                </div>

                <div className='mf-card flex-1 p-6 sm:p-8 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" /></p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-1 px-2 border border-line text-xs rounded-full'>{docInfo.experience}</button>
                    </div>
                    <p className='mt-2 text-sm font-medium text-primary'>{docInfo.clinicName}</p>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-5' src={assets.info_icon} alt="" /></p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span> </p>
                </div>
            </div>

            {/* Booking slots */}
            <div className='mf-card sm:ml-72 sm:pl-4 mt-8 p-5 sm:p-6 font-medium text-slate-600'>
                <p className='text-xl text-ink'>Choose a time</p>
                <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
                    {docSlots.length && docSlots.map((item, index) => (
                        <div onClick={() => setSlotIndex(index)} key={index} className={`text-center py-5 min-w-16 rounded-md cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-line bg-white hover:border-teal'}`}>
                            <p>{daysOfWeek[item.datetime.getDay()]}</p>
                            <p>{item.datetime.getDate()}</p>
                        </div>
                    ))}
                </div>

                <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
                    {slotsLoading && <p className='text-sm text-slate-500'>Loading available times...</p>}
                    {!slotsLoading && slotsError && <p className='text-sm text-red-600'>{slotsError}</p>}
                    {!slotsLoading && !slotsError && docSlots[slotIndex]?.slots.map((item, index) => (
                        <p onClick={() => setSlotTime(item.time)} key={index} className={`text-sm font-medium flex-shrink-0 px-5 py-2 rounded-md cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-slate-600 border border-line bg-white hover:border-teal'}`}>{item.time}</p>
                    ))}
                    {!slotsLoading && !slotsError && docSlots[slotIndex]?.slots.length === 0 && <p className='text-sm text-slate-500'>No available times on this day.</p>}
                </div>

                <button onClick={bookAppointment} disabled={!slotTime} className='mf-button my-6 disabled:cursor-not-allowed disabled:opacity-60'>Book appointment</button>
            </div>

            {/* Listing Releated Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </section>
    )
}

export default Appointment
