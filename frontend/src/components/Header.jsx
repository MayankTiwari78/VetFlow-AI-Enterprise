import React from 'react'
import { assets } from '../assets/assets'

const Header = () => {
    return (
        <section className='relative grid min-h-[560px] overflow-hidden rounded-lg border border-[#B9DDE0] bg-[#E9F6F6] lg:grid-cols-[1.05fr_.95fr]'>

            {/* --------- Header Left --------- */}
            <div className='relative z-10 flex flex-col items-start justify-center gap-6 px-6 py-12 sm:px-10 lg:px-14 lg:py-16'>
                <p className='mf-eyebrow'>VetFlow AI veterinary care</p>
                <h1 className='text-4xl md:text-5xl lg:text-6xl text-ink font-semibold leading-tight'>
                    Better Care for Every <span className='text-primary'>Pet</span>
                </h1>
                <p className='max-w-xl text-base leading-7 text-slate-600 sm:text-lg'>Manage pets, vaccinations, appointments, AI health insights and trusted veterinarians from one modern platform.</p>
                <div className='flex flex-col md:flex-row items-center gap-3 text-slate-600 text-sm'>
                    <div className='flex -space-x-2 text-2xl' aria-hidden='true'><span>🐶</span><span>🐱</span><span>🐰</span></div>
                    <p><strong className='text-ink'>Made for pet families</strong><br />Organized records and trusted veterinary access.</p>
                </div>
                <div className='flex flex-wrap gap-3'>
                    <a href='/pet-owner/pets/register' className='mf-button'>Register Pet</a>
                    <a href='/doctors' className='mf-button-secondary'>Book Appointment</a>
                </div>
            </div>

            {/* --------- Header Right --------- */}
            <div className='relative flex min-h-[390px] items-end justify-center overflow-hidden border-t border-[#B9DDE0] bg-[#DDF0F0] px-6 lg:border-l lg:border-t-0'>
                <div className='absolute left-6 top-7 z-10 rounded-md border border-white/80 bg-white/95 px-4 py-3 shadow-[0_10px_24px_rgba(21,48,72,0.12)]'>
                    <p className='text-xs font-bold uppercase tracking-[0.12em] text-teal'>Pet wellness</p>
                    <p className='mt-1 text-sm font-semibold text-ink'>Care built around every companion</p>
                </div>
                <img className='relative z-0 h-full max-h-[500px] w-full object-contain object-bottom' src={assets.veterinary_hero} alt="Veterinarian caring for a dog" />
                <div className='absolute bottom-6 right-6 z-10 flex items-center gap-3 rounded-md border border-white/80 bg-ink px-4 py-3 text-white shadow-[0_10px_24px_rgba(21,48,72,0.16)]'>
                    <span className='h-2.5 w-2.5 rounded-full bg-[#62D8C8]' />
                    <div><p className='text-xs text-[#BCE9E4]'>Booking status</p><p className='text-sm font-semibold'>Availability updated live</p></div>
                </div>
            </div>
        </section>
    )
}

export default Header