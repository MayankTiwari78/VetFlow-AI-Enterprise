import React from 'react'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <main className='py-10 sm:py-14'>
        <div className='max-w-3xl'>
            <p className='mf-eyebrow'>About VetFlow AI</p>
            <h1 className='mf-title'>Veterinary care should feel clear, connected, and compassionate.</h1>
            <p className='mf-copy'>We bring pet registration, vaccination tracking, appointment discovery, and AI-assisted health insights into one dependable pet owner experience.</p>
        </div>
        <section className='my-10 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-[.85fr_1.15fr]'>
            <img className='h-full min-h-80 w-full bg-mist object-cover' src={assets.veterinary_care} alt="Veterinarian caring for a pet" />
            <div className='flex flex-col justify-center gap-6 p-7 text-sm leading-7 text-slate-600 sm:p-10'>
                <p>VetFlow AI helps pet owners find appropriate veterinarians, track vaccinations, and manage appointments without losing sight of privacy, accessibility, or trust.</p>
                <p>Our platform is built around straightforward workflows: clear availability, reliable account security, and pet health information presented without unnecessary friction.</p>
                <div className='border-l-4 border-teal pl-5'>
                    <h2 className='text-xl font-semibold text-ink'>Our vision</h2>
                    <p className='mt-2'>Create a veterinary care experience where pet owners and veterinarians can coordinate confidently, with the right information available at the right moment.</p>
                </div>
            </div>
        </section>

        <section className='py-8'>
            <p className='mf-eyebrow'>Our mission</p>
            <div className='mt-6 grid border-y border-line bg-white md:grid-cols-3'>
            <div className='px-7 py-8 md:border-r md:border-line'>
                <p className='text-sm font-bold text-primary'>01</p><h2 className='mt-3 text-xl font-semibold text-ink'>Modern pet care</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Bring every pet health record, vaccination, and appointment into one clear, modern platform designed for pet families.</p>
            </div>
            <div className='border-t border-line px-7 py-8 md:border-r md:border-t-0'>
                <p className='text-sm font-bold text-primary'>02</p><h2 className='mt-3 text-xl font-semibold text-ink'>Trusted veterinarians</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Connect with certified and experienced veterinarians across every specialty your companion may need.</p>
            </div>
            <div className='border-t border-line px-7 py-8 md:border-t-0'>
                <p className='text-sm font-bold text-primary'>03</p><h2 className='mt-3 text-xl font-semibold text-ink'>AI-powered insights</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Use AI-assisted health analysis to understand your pet's records and prepare for every veterinary visit.</p>
            </div>
            </div>
        </section>

        <section className='py-8'>
            <p className='mf-eyebrow'>Our AI philosophy</p>
            <div className='mt-6 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-2'>
                <div className='p-7 sm:p-10'>
                    <h2 className='text-2xl font-semibold text-ink'>AI that supports, never replaces</h2>
                    <p className='mt-4 text-sm leading-7 text-slate-600'>VetFlow AI uses artificial intelligence to summarize pet health records, highlight vaccination milestones, and prepare pet owners for veterinary consultations. Our AI is designed to support professional veterinary judgment, not replace it.</p>
                    <p className='mt-4 text-sm leading-7 text-slate-600'>Every AI report includes a clear clinical warning, reminding pet owners that a licensed veterinarian must always make the final diagnosis and treatment decisions.</p>
                </div>
                <div className='flex items-center justify-center bg-[#E9F6F6] p-7 sm:p-10'>
                    <div className='max-w-sm text-center'>
                        <span className='mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-3xl shadow-[0_10px_24px_rgba(21,48,72,0.12)]' aria-hidden='true'>🤖</span>
                        <h3 className='mt-5 text-lg font-semibold text-ink'>Responsible AI for pet health</h3>
                        <p className='mt-3 text-sm leading-6 text-slate-600'>Transparent, educational, and always paired with professional veterinary care.</p>
                    </div>
                </div>
            </div>
        </section>
    </main>
  )
}

export default About