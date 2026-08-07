import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from '../lib/routerCompat'
import { publicEnv } from '../lib/env'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { isAuthSessionHandledError } from '../api/authClient'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'
import { normalizeDoctor } from '../lib/veterinaryDisplay'

const MyAppointments = () => {

    const { authStatus, backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()
    useProtectedPatientRoute({ authStatus, token })

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
            const date = new Date(`${slotDate}T12:00:00`)
            return Number.isNaN(date.getTime()) ? slotDate : `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
        }
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1]) - 1] + " " + dateArray[2]
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(
              (data.appointments || []).reverse().map((appointment) => ({
                ...appointment,
                docData: normalizeDoctor(appointment.docData)
              }))
            )

        } catch (error) {
            console.log(error)
            if (!isAuthSessionHandledError(error)) toast.error(error.message)
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }   

        } catch (error) {
            console.log(error)
            if (!isAuthSessionHandledError(error)) toast.error(error.message)
        }

    }

    const initPay = (order) => {
        const options = {
            key: publicEnv.razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {

                console.log(response)

                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
                    if (data.success) {
                        navigate('/my-appointments')
                        getUserAppointments()
                    }
                } catch (error) {
                    console.log(error)
                    if (!isAuthSessionHandledError(error)) toast.error(error.message)
                }
            }
        };
        if (typeof window === 'undefined' || !window.Razorpay) {
            toast.error('The payment service is unavailable. Please try again.')
            return
        }
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    // Function to make payment using razorpay
    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) {
                initPay(data.order)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            if (!isAuthSessionHandledError(error)) toast.error(error.message)
        }
    }

    // Function to make payment using stripe
    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                const { session_url } = data
                window.location.replace(session_url)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            if (!isAuthSessionHandledError(error)) toast.error(error.message)
        }
    }



    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    if (authStatus === 'initializing') {
        return <div className='py-12'><div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' /></div>
    }

    if (!token) {
        return <div className='py-12'><div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' /></div>
    }

    return (
        <section className='py-10'>
            <div className='mb-8'><p className='mf-eyebrow'>Your pet care plan</p><h1 className='mf-title'>My appointments</h1><p className='mf-copy'>Review veterinary appointment details, payments, and changes from one place.</p></div>
            <div className='space-y-4'>
                {appointments.map((item, index) => (
                    <div key={index} className='mf-card grid grid-cols-[1fr_2fr] gap-4 p-4 sm:flex sm:gap-6 sm:p-5'>
                        <div>
                            <img className='w-32 rounded-md bg-[#E7F4F5]' src={item.docData.image} alt={item.docData.name} />
                        </div>
                        <div className='flex-1 text-sm text-[#5E5E5E]'>
                            <p className='text-[#262626] text-base font-semibold'>{item.docData.name}</p>
                            <p>{item.docData.speciality}</p>
                            <p className='text-[#464646] font-medium mt-1'>Address:</p>
                            <p className=''>{item.docData.address.line1}</p>
                            <p className=''>{item.docData.address.line2}</p>
                            <p className=' mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime}</p>
                        </div>
                        <div></div>
                        <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                            {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && <button onClick={() => setPayment(item._id)} className='mf-button-secondary sm:min-w-48'>Pay online</button>}
                            {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentStripe(item._id)} className='sm:min-w-48 rounded-md border border-line py-2 hover:bg-mist flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="Stripe" /></button>}
                            {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentRazorpay(item._id)} className='sm:min-w-48 rounded-md border border-line py-2 hover:bg-mist flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="Razorpay" /></button>}
                            {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 rounded-md bg-emerald-50 text-emerald-700'>Paid</button>}

                            {item.isCompleted && <button className='sm:min-w-48 py-2 rounded-md border border-emerald-500 text-emerald-700'>Completed</button>}

                            {!item.cancelled && !item.isCompleted && <button onClick={() => cancelAppointment(item._id)} className='sm:min-w-48 py-2 rounded-md border border-red-200 text-red-700 hover:bg-red-50'>Cancel appointment</button>}
                            {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 rounded-md border border-red-200 text-red-700'>Appointment cancelled</button>}
                        </div>
                    </div>
                ))}
                {appointments.length === 0 && <div className='mf-card p-10 text-center'><p className='font-semibold text-ink'>No appointments yet</p><p className='mt-2 text-sm text-slate-600'>When you book veterinary care, its details and payment options will appear here.</p><button onClick={() => navigate('/doctors')} className='mf-button mt-5'>Find a veterinarian</button></div>}
            </div>
        </section>
    )
}

export default MyAppointments
