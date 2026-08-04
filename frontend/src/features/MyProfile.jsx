import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { isAuthSessionHandledError } from '../api/authClient'
import { useProtectedPatientRoute } from '../hooks/useProtectedPatientRoute'

const MyProfile = () => {

    const [isEdit, setIsEdit] = useState(false)

    const [image, setImage] = useState(false)

    const { authStatus, token, backendUrl, userData, setUserData, loadUserProfileData } = useContext(AppContext)
    useProtectedPatientRoute({ authStatus, token })

    // Function to update user profile data using API
    const updateUserProfileData = async () => {

        try {

            const formData = new FormData();

            formData.append('name', userData.name)
            formData.append('phone', userData.phone)
            formData.append('address', JSON.stringify(userData.address))
            formData.append('gender', userData.gender)
            formData.append('dob', userData.dob)

            image && formData.append('image', image)

            const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                await loadUserProfileData()
                setIsEdit(false)
                setImage(false)
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

    if (authStatus === 'initializing') {
        return <div className='py-12'><div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' /></div>
    }

    if (!token) {
        return <div className='py-12'><div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' /></div>
    }

    return userData ? (
        <section className='max-w-2xl py-10'>
        <div className='mb-7'><p className='mf-eyebrow'>Account settings</p><h1 className='mf-title'>My profile</h1><p className='mf-copy'>Keep your contact and personal details ready for care coordination.</p></div>
        <div className='mf-card flex flex-col gap-3 p-6 text-sm'>

            {isEdit
                ? <label htmlFor='image' >
                    <div className='inline-block relative cursor-pointer'>
                        <img className='w-32 rounded-md opacity-75' src={image ? URL.createObjectURL(image) : userData.image} alt="Profile preview" />
                        <img className='w-10 absolute bottom-12 right-12' src={image ? '' : assets.upload_icon} alt="" />
                    </div>
                    <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
                </label>
                : <img className='w-32 rounded-md bg-mist' src={userData.image} alt="Profile" />
            }

            {isEdit
                ? <input className='mf-field max-w-sm text-2xl font-semibold' type="text" onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))} value={userData.name} />
                : <p className='font-semibold text-3xl text-ink mt-2'>{userData.name}</p>
            }

            <hr className='bg-line h-px border-none my-2' />

            <div>
                <p className='mf-eyebrow mt-3'>CONTACT INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-[#363636]'>
                    <p className='font-medium'>Email id:</p>
                    <p className='text-primary'>{userData.email}</p>
                    <p className='font-medium'>Phone:</p>

                    {isEdit
                        ? <input className='mf-field max-w-52' type="text" onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))} value={userData.phone} />
                        : <p className='text-primary'>{userData.phone}</p>
                    }

                    <p className='font-medium'>Address:</p>

                    {isEdit
                        ? <p>
                            <input className='mf-field' type="text" onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={userData.address.line1} />
                            <br />
                            <input className='mf-field' type="text" onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={userData.address.line2} /></p>
                        : <p className='text-gray-500'>{userData.address.line1} <br /> {userData.address.line2}</p>
                    }

                </div>
            </div>
            <div>
                <p className='mf-eyebrow mt-5'>BASIC INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-gray-600'>
                    <p className='font-medium'>Gender:</p>

                    {isEdit
                        ? <select className='mf-field max-w-32' onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))} value={userData.gender} >
                            <option value="Not Selected">Not Selected</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        : <p className='text-gray-500'>{userData.gender}</p>
                    }

                    <p className='font-medium'>Birthday:</p>

                    {isEdit
                        ? <input className='mf-field max-w-40' type='date' onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))} value={userData.dob} />
                        : <p className='text-gray-500'>{userData.dob}</p>
                    }

                </div>
            </div>
            <div className='mt-10'>

                {isEdit
                    ? <button onClick={updateUserProfileData} className='mf-button'>Save information</button>
                    : <button onClick={() => setIsEdit(true)} className='mf-button-secondary'>Edit profile</button>
                }

            </div>
        </div>
        </section>
    ) : <div className='py-12'><div className='mf-card h-80 animate-pulse bg-[#EAF3F4]' /></div>
}

export default MyProfile
