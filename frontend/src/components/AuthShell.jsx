import React from 'react'
import { motion } from 'framer-motion'
import { assets } from '../assets/assets'
import BrandLogo from './BrandLogo'
import { Brain, CalendarCheck, FileText, ShieldCheck, Syringe } from 'lucide-react'

const highlights = [
  { icon: Brain, title: 'AI Health', copy: 'Smart summaries for every visit' },
  { icon: CalendarCheck, title: 'Appointments', copy: 'Book trusted veterinarians fast' },
  { icon: FileText, title: 'Medical Records', copy: 'One secure pet health timeline' },
  { icon: Syringe, title: 'Vaccinations', copy: 'Preventive care reminders' },
]

const AuthShell = ({ eyebrow, title, description, children }) => (
  <div className='min-h-[calc(100vh-5rem)] py-10 sm:py-14'>
    <div className='mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]'>
      <aside className='relative isolate hidden min-h-[720px] overflow-hidden rounded-[36px] bg-ink p-8 text-white shadow-soft-xl lg:flex lg:flex-col lg:justify-between'>
        <div className='absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(15,157,138,0.5),rgba(15,23,42,0.96)_46%,rgba(56,217,169,0.28))]' />
        <div className='relative z-10'>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-xl'
          >
            <ShieldCheck className='h-3.5 w-3.5 text-accent' />
            Secure veterinary intelligence
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='mt-6 max-w-md text-5xl font-black leading-[1.05]'
          >
            AI powered pet care, beautifully organized.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='mt-5 max-w-md text-base leading-8 text-white/70'
          >
            MEDFLOW AI keeps records, reminders, and care context close without making the experience feel clinical or heavy.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className='relative my-8'
        >
          <div className='overflow-hidden rounded-[30px] border border-white/12 bg-white/10 p-3 backdrop-blur-xl'>
            <img src={assets.veterinary_care} alt='Veterinary healthcare illustration' className='h-72 w-full rounded-[24px] object-cover' />
          </div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className='absolute -right-3 top-8 rounded-[22px] border border-white/20 bg-white/15 p-4 shadow-soft-xl backdrop-blur-2xl'
          >
            <p className='text-xs font-semibold text-white/60'>Health Score</p>
            <p className='mt-1 text-2xl font-black text-white'>92</p>
          </motion.div>
        </motion.div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + index * 0.07 }}
              className='rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl'
            >
              <item.icon className='h-5 w-5 text-accent' />
              <p className='mt-3 font-bold'>{item.title}</p>
              <p className='mt-1 text-xs leading-5 text-white/60'>{item.copy}</p>
            </motion.div>
          ))}
        </div>
      </aside>

      <main className='flex items-center justify-center'>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
          className='glass-card w-full max-w-xl p-6 shadow-soft-xl sm:p-8 lg:p-10'
        >
          <div className='flex justify-center'>
            <BrandLogo />
          </div>
          {eyebrow && <p className='mt-8 text-center mf-eyebrow'>{eyebrow}</p>}
          {title && <h1 className='mt-3 text-center text-4xl font-black text-ink'>{title}</h1>}
          {description && <p className='mx-auto mt-3 max-w-md text-center text-sm leading-7 text-muted'>{description}</p>}
          <div className='mt-8'>{children}</div>
        </motion.div>
      </main>
    </div>
  </div>
)

export default AuthShell
