import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from '../lib/routerCompat'

const Banner = () => {

    const navigate = useNavigate()

    return (
        <section className='relative flex overflow-hidden rounded-lg bg-ink px-6 sm:px-10 md:px-14 lg:px-12'>

            {/* ------- Left Side ------- */}
            <div className='flex-1 py-8 sm:py-10 md:py-16 lg:py-24 lg:pl-5'>
                <div className='text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold text-white'>
                    <p>Give every pet a healthier</p>
                    <p className='mt-2 text-[#9CE5DE]'>tomorrow.</p>
                </div>
                <button onClick={() => { navigate('/pet-owner/pets/register'); scrollTo(0, 0) }} className='mf-button-secondary border-white bg-white mt-6'>Register your pet</button>
            </div>

            {/* ------- Right Side ------- */}
            <div className='hidden md:block md:w-1/2 lg:w-[370px] relative'>
                <img className='h-full w-full absolute bottom-0 right-0 object-contain' src={assets.veterinary_care} alt="Pet wellness illustration" />
            </div>
        </section>
    )
}

export default Banner
