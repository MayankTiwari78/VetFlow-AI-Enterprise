import React from 'react'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <main className='py-10 sm:py-14'>
        <div className='max-w-3xl'>
            <p className='mf-eyebrow'>About MedFlow AI</p>
            <h1 className='mf-title'>Healthcare access should feel clear, connected, and human.</h1>
            <p className='mf-copy'>We bring appointment discovery, account protection, and care coordination into one dependable patient experience.</p>
        </div>
        <section className='my-10 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-[.85fr_1.15fr]'>
            <img className='h-full min-h-80 w-full bg-mist object-cover' src={assets.about_image} alt="Healthcare team collaborating" />
            <div className='flex flex-col justify-center gap-6 p-7 text-sm leading-7 text-slate-600 sm:p-10'>
                <p>MedFlow AI helps people find appropriate clinicians and manage appointments without losing sight of privacy, accessibility, or trust.</p>
                <p>Our platform is built around straightforward workflows: clear availability, reliable account security, and care information presented without unnecessary friction.</p>
                <div className='border-l-4 border-teal pl-5'>
                    <h2 className='text-xl font-semibold text-ink'>Our vision</h2>
                    <p className='mt-2'>Create a healthcare experience where patients and providers can coordinate confidently, with the right information available at the right moment.</p>
                </div>
            </div>
        </section>
        <section className='py-8'>
            <p className='mf-eyebrow'>Why patients choose us</p>
            <div className='mt-6 grid border-y border-line bg-white md:grid-cols-3'>
            <div className='px-7 py-8 md:border-r md:border-line'>
                <p className='text-sm font-bold text-primary'>01</p><h2 className='mt-3 text-xl font-semibold text-ink'>Efficient booking</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Find available care and move from discovery to a confirmed appointment with fewer steps.</p>
            </div>
            <div className='border-t border-line px-7 py-8 md:border-r md:border-t-0'>
                <p className='text-sm font-bold text-primary'>02</p><h2 className='mt-3 text-xl font-semibold text-ink'>Trusted access</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Review clinician profiles and availability in a consistent, easy-to-scan format.</p>
            </div>
            <div className='border-t border-line px-7 py-8 md:border-t-0'>
                <p className='text-sm font-bold text-primary'>03</p><h2 className='mt-3 text-xl font-semibold text-ink'>Protected accounts</h2>
                <p className='mt-3 text-sm leading-6 text-slate-600'>Two-factor authentication and session controls keep account access visible and manageable.</p>
            </div>
            </div>
        </section>
    </main>
  )
}

export default About
