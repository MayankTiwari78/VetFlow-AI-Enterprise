import React from 'react'
import BrandLogo from './BrandLogo'

const Footer = () => {
  return (
    <footer className='mt-16 border-t border-line bg-white'>
      <div className='mf-page flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-12 py-12 text-sm'>

        <div>
          <BrandLogo />
          <p className='mt-5 w-full md:w-2/3 text-slate-600 leading-6'>Appointments, account protection, and care coordination in one dependable healthcare experience.</p>
        </div>

        <div>
          <p className='text-base font-semibold mb-5 text-ink'>EXPLORE</p>
          <ul className='flex flex-col gap-2 text-slate-600'>
            <li>Home</li>
            <li>About us</li>
            <li>Security</li>
            <li>Privacy</li>
          </ul>
        </div>

        <div>
          <p className='text-base font-semibold mb-5 text-ink'>SUPPORT</p>
          <ul className='flex flex-col gap-2 text-slate-600'>
            <li>Care coordination</li>
            <li>support@medflow.ai</li>
          </ul>
        </div>

      </div>
      <div className='border-t border-line'>
        <p className='mf-page py-5 text-sm text-center text-slate-500'>Copyright 2026 Mayank Tiwari. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
