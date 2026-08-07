import React from 'react'
import { Link } from '../lib/routerCompat'
import BrandLogo from './BrandLogo'
import { Heart, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'

const Footer = () => {
  return (
    <footer className='mt-20 border-t border-line/60 bg-white'>
      {/* Main Footer */}
      <div className='mf-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Brand */}
        <div className='lg:col-span-1'>
          <BrandLogo />
          <p className='mt-5 max-w-sm text-base leading-relaxed text-muted'>
            Appointments, vaccination tracking, and veterinary care coordination in one dependable pet care experience.
          </p>
          <div className='mt-6 flex items-center gap-4'>
            <div className='grid h-9 w-9 place-items-center rounded-xl border border-line/60 text-muted hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200'>
              <Mail className='h-4 w-4' />
            </div>
            <div className='grid h-9 w-9 place-items-center rounded-xl border border-line/60 text-muted hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200'>
              <Phone className='h-4 w-4' />
            </div>
            <div className='grid h-9 w-9 place-items-center rounded-xl border border-line/60 text-muted hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200'>
              <MapPin className='h-4 w-4' />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <p className='text-sm font-bold uppercase tracking-[0.12em] text-ink'>Explore</p>
          <ul className='mt-5 flex flex-col gap-3'>
            {['Home', 'About us', 'Veterinarians', 'Pricing', 'Contact'].map((item) => (
              <li key={item}>
                <Link to={item === 'Home' ? '/' : `/${item.toLowerCase().replace(/\s+/g, '-')}`} className='flex items-center gap-1 text-base text-muted hover:text-primary transition-colors duration-200'>
                  {item}
                  <ArrowUpRight className='h-3 w-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all' />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <p className='text-sm font-bold uppercase tracking-[0.12em] text-ink'>Support</p>
          <ul className='mt-5 flex flex-col gap-3'>
            {['Privacy Policy', 'Terms of Service', 'Security', 'FAQ'].map((item) => (
              <li key={item}>
                <Link to={`/${item.toLowerCase().replace(/\s+/g, '-')}`} className='text-base text-muted hover:text-primary transition-colors duration-200'>
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className='text-sm font-bold uppercase tracking-[0.12em] text-ink'>Contact</p>
          <ul className='mt-5 flex flex-col gap-3 text-base text-muted'>
            <li className='flex items-center gap-3'>
              <Mail className='h-4 w-4 text-primary' />
              support@medflow.ai
            </li>
            <li className='flex items-center gap-3'>
              <Phone className='h-4 w-4 text-primary' />
              (415) 555-0132
            </li>
            <li className='flex items-start gap-3'>
              <MapPin className='h-4 w-4 text-primary mt-0.5' />
              <span>54709 Willms Station, Suite 350, Washington, USA</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className='border-t border-line/60'>
        <div className='mf-page flex flex-col items-center justify-between gap-4 py-6 sm:flex-row'>
          <p className='text-sm text-muted'>
            Copyright 2026 Mayank Tiwari. All rights reserved.
          </p>
          <div className='flex items-center gap-1 text-sm text-muted'>
            Made with <Heart className='h-4 w-4 text-primary fill-primary' strokeWidth={0} /> for every pet
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer