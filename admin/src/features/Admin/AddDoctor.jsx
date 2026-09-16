import React, { useContext, useState } from 'react'
import { assets } from '../../assets/assets'
import { toast } from 'react-toastify'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'

const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'

const validatePassword = (password = '') => {
  const value = String(password || '')
  if (value.length < 8) return PASSWORD_POLICY_MESSAGE
  if (!/[a-z]/.test(value)) return PASSWORD_POLICY_MESSAGE
  if (!/[A-Z]/.test(value)) return PASSWORD_POLICY_MESSAGE
  if (!/\d/.test(value)) return PASSWORD_POLICY_MESSAGE
  if (!/[^A-Za-z0-9]/.test(value)) return PASSWORD_POLICY_MESSAGE
  return null
}

const passwordRequirements = (password = '') => {
  const value = String(password || '')
  return [
    { key: 'length', label: '8+ characters', met: value.length >= 8 },
    { key: 'uppercase', label: 'Uppercase letter', met: /[A-Z]/.test(value) },
    { key: 'lowercase', label: 'Lowercase letter', met: /[a-z]/.test(value) },
    { key: 'number', label: 'Number', met: /\d/.test(value) },
    { key: 'special', label: 'Special character', met: /[^A-Za-z0-9]/.test(value) },
  ]
}

const AddDoctor = () => {

    const [docImg, setDocImg] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [experience, setExperience] = useState('1 Year')
    const [fees, setFees] = useState('')
    const [about, setAbout] = useState('')
    const [speciality, setSpeciality] = useState('General physician')
    const [degree, setDegree] = useState('')
    const [address1, setAddress1] = useState('')
    const [address2, setAddress2] = useState('')

    const { backendUrl } = useContext(AppContext)
    const { aToken } = useContext(AdminContext)

    const onSubmitHandler = async (event) => {
        event.preventDefault()

        try {

            if (!docImg) {
                return toast.error('Image Not Selected')
            }

            const passwordError = validatePassword(password)
            if (passwordError) {
                return toast.error(passwordError)
            }

            const formData = new FormData();

            formData.append('image', docImg)
            formData.append('name', name)
            formData.append('email', email)
            formData.append('password', password)
            formData.append('experience', experience)
            formData.append('fees', Number(fees))
            formData.append('about', about)
            formData.append('speciality', speciality)
            formData.append('degree', degree)
            formData.append('address', JSON.stringify({ line1: address1, line2: address2 }))

            const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                setDocImg(false)
                setName('')
                setPassword('')
                setEmail('')
                setAddress1('')
                setAddress2('')
                setDegree('')
                setAbout('')
                setFees('')
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }

    }

    return (
        <form onSubmit={onSubmitHandler} className='portal-page'>

            <div><p className='portal-eyebrow'>Clinical network</p><h1 className='portal-title'>Add a doctor</h1><p className='mt-2 text-slate-600'>Create a clinician account and profile for this organization.</p></div>

            <div className='portal-card w-full max-w-4xl max-h-[75vh] overflow-y-auto p-6 sm:p-8'>
                <div className='flex items-center gap-4 mb-8 text-slate-500'>
                    <label htmlFor="doc-img">
                        <img className='w-16 bg-gray-100 rounded-full cursor-pointer' src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} alt="" />
                    </label>
                    <input onChange={(e) => setDocImg(e.target.files[0])} type="file" name="" id="doc-img" hidden />
                    <p className='text-sm font-semibold'>Upload clinician<br />profile image</p>
                </div>

                <div className='flex flex-col lg:flex-row items-start gap-8 text-slate-600'>

                    <div className='w-full lg:flex-1 flex flex-col gap-4'>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p className='font-semibold'>Full name</p>
                            <input onChange={e => setName(e.target.value)} value={name} className='portal-field' type="text" placeholder='Name' required />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Doctor Email</p>
                            <input onChange={e => setEmail(e.target.value)} value={email} className='portal-field' type="email" placeholder='Email' required />
                        </div>


                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Set Password</p>
                            <input onChange={e => setPassword(e.target.value)} value={password} className='portal-field' type="password" placeholder='At least 8 characters with uppercase, lowercase, number & symbol' required />
                            {password ? (
                                <div className='mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5'>
                                    <p className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>Password requirements</p>
                                    <ul className='mt-1.5 grid gap-0.5 text-xs font-semibold'>
                                        {passwordRequirements(password).map((item) => (
                                            <li key={item.key} className={item.met ? 'text-emerald-700' : 'text-slate-500'}>
                                                <span aria-hidden='true'>{item.met ? '✓' : '○'} </span>
                                                {item.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Experience</p>
                            <select onChange={e => setExperience(e.target.value)} value={experience} className='portal-field' >
                                <option value="1 Year">1 Year</option>
                                <option value="2 Year">2 Years</option>
                                <option value="3 Year">3 Years</option>
                                <option value="4 Year">4 Years</option>
                                <option value="5 Year">5 Years</option>
                                <option value="6 Year">6 Years</option>
                                <option value="8 Year">8 Years</option>
                                <option value="9 Year">9 Years</option>
                                <option value="10 Year">10 Years</option>
                            </select>
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Fees</p>
                            <input onChange={e => setFees(e.target.value)} value={fees} className='portal-field' type="number" placeholder='Doctor fees' required />
                        </div>

                    </div>

                    <div className='w-full lg:flex-1 flex flex-col gap-4'>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Speciality</p>
                            <select onChange={e => setSpeciality(e.target.value)} value={speciality} className='portal-field'>
                                <option value="General physician">General physician</option>
                                <option value="Gynecologist">Gynecologist</option>
                                <option value="Dermatologist">Dermatologist</option>
                                <option value="Pediatricians">Pediatricians</option>
                                <option value="Neurologist">Neurologist</option>
                                <option value="Gastroenterologist">Gastroenterologist</option>
                            </select>
                        </div>


                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Degree</p>
                            <input onChange={e => setDegree(e.target.value)} value={degree} className='portal-field' type="text" placeholder='Degree' required />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Address</p>
                            <input onChange={e => setAddress1(e.target.value)} value={address1} className='portal-field' type="text" placeholder='Address 1' required />
                            <input onChange={e => setAddress2(e.target.value)} value={address2} className='portal-field' type="text" placeholder='Address 2' required />
                        </div>

                    </div>

                </div>

                <div>
                    <p className='mt-4 mb-2'>About Doctor</p>
                    <textarea onChange={e => setAbout(e.target.value)} value={about} className='portal-field' rows={5} placeholder='Professional profile'></textarea>
                </div>

                <button type='submit' className='portal-button mt-5'>Create clinician profile</button>

            </div>


        </form>
    )
}

export default AddDoctor
