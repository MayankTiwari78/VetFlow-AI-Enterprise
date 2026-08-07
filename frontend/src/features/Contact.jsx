import React from 'react'
import { assets } from '../assets/assets'

const Contact = () => {
  return (
    <main className='py-10 sm:py-14'>
      <div className='max-w-3xl'>
        <p className='mf-eyebrow'>Contact VetFlow AI</p>
        <h1 className='mf-title'>Support that meets you where pet care happens.</h1>
        <p className='mf-copy'>For account, appointment, or veterinary care questions, reach our team through the channel that suits you.</p>
      </div>

      <section className='my-10 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-2'>
        <img className='h-full min-h-96 w-full bg-mist object-cover' src={assets.veterinary_care} alt="VetFlow AI veterinary support team" />
        <div className='flex flex-col justify-center gap-8 p-7 sm:p-10'>
          <div><p className='mf-eyebrow'>Veterinary support</p><h2 className='mt-2 text-2xl font-semibold text-ink'>We are here to help.</h2></div>
          <div className='grid gap-5 text-sm text-slate-600 sm:grid-cols-2'>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Support</p><p className='mt-1'>support@vetflow.ai</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Emergency Contact</p><p className='mt-1'>(415) 555-0132</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Clinic Partnership</p><p className='mt-1'>partners@vetflow.ai</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>General Inquiry</p><p className='mt-1'>hello@vetflow.ai</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Phone</p><p className='mt-1'>(415) 555-0132</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Location</p><p className='mt-1'>54709 Willms Station, Suite 350, Washington, USA</p></div>
          </div>
          <p className='rounded-md bg-mist px-4 py-3 text-xs leading-5 text-slate-600'>For pet emergencies, contact your local emergency veterinary clinic immediately. VetFlow AI support does not provide emergency medical advice.</p>
        </div>
      </section>
    </main>
  )
}

export default Contact