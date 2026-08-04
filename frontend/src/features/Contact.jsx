import React from 'react'
import { assets } from '../assets/assets'

const Contact = () => {
  return (
    <main className='py-10 sm:py-14'>
      <div className='max-w-3xl'>
        <p className='mf-eyebrow'>Contact MedFlow AI</p>
        <h1 className='mf-title'>Support that meets you where care happens.</h1>
        <p className='mf-copy'>For account, appointment, or care-coordination questions, reach our team through the channel that suits you.</p>
      </div>

      <section className='my-10 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-2'>
        <img className='h-full min-h-96 w-full bg-mist object-cover' src={assets.contact_image} alt="MedFlow AI support team" />
        <div className='flex flex-col justify-center gap-8 p-7 sm:p-10'>
          <div><p className='mf-eyebrow'>Care support</p><h2 className='mt-2 text-2xl font-semibold text-ink'>We are here to help.</h2></div>
          <div className='grid gap-5 text-sm text-slate-600 sm:grid-cols-2'>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Email</p><p className='mt-1'>support@medflow.ai</p></div>
            <div className='border-l-2 border-teal pl-4'><p className='font-semibold text-ink'>Phone</p><p className='mt-1'>(415) 555-0132</p></div>
            <div className='border-l-2 border-teal pl-4 sm:col-span-2'><p className='font-semibold text-ink'>Office</p><p className='mt-1'>54709 Willms Station, Suite 350, Washington, USA</p></div>
          </div>
          <p className='rounded-md bg-mist px-4 py-3 text-xs leading-5 text-slate-600'>For medical emergencies, contact your local emergency service. MedFlow AI support does not provide emergency medical advice.</p>
        </div>
      </section>
    </main>
  )
}

export default Contact
