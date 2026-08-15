import React, { useContext } from 'react'
import { motion } from 'framer-motion'
import { assets } from '../assets/assets'
import { ArrowRight, Sparkles, ShieldCheck, CalendarCheck, FileText, Syringe, Star } from 'lucide-react'
import { Link } from '../lib/routerCompat'
import { AppContext } from '../context/AppContext'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.72, ease: [0.21, 0.47, 0.32, 0.98] }
  })
}

const floatingCards = [
  { className: 'left-2 top-16 sm:-left-4 lg:-left-8', icon: Syringe, label: 'Next Vaccine', value: 'Aug 20, 2025', tone: 'bg-primary/10 text-primary', delay: 0, distance: -12 },
  { className: 'right-1 top-40 sm:-right-2 lg:-right-6', icon: FileText, label: 'AI Health Report', value: 'Low Risk', tone: 'bg-accent/10 text-primary', delay: 1, distance: -10 },
  { className: 'left-1 bottom-32 sm:-left-2 lg:-left-10', icon: ShieldCheck, label: '640+ Vets', value: '4.9 avg rating', tone: 'bg-secondary/10 text-secondary', delay: 0.5, distance: -8 },
]

const Header = () => {
  const { userData, token } = useContext(AppContext)

  return (
    <section id='home' className='relative isolate overflow-hidden rounded-[36px] border border-white/70 bg-white/50 shadow-soft-xl'>
      <div className='mf-soft-grid absolute inset-0 -z-10 opacity-80' />
      <div className='absolute inset-0 -z-10 bg-[linear-gradient(125deg,rgba(15,157,138,0.10),rgba(255,255,255,0.82)_38%,rgba(56,217,169,0.14))]' />

      <div className='grid min-h-[calc(100vh-7rem)] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:px-10 lg:py-16 xl:px-14'>
        <div className='max-w-2xl'>
          <motion.div variants={fadeUp} initial='hidden' animate='visible' custom={0}>
            <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-xs font-bold text-primary shadow-soft backdrop-blur-xl'>
              <Sparkles className='h-4 w-4' />
              AI Powered Veterinary Healthcare Platform
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial='hidden' animate='visible' custom={1} className='mt-6 text-5xl font-black leading-[1.04] text-ink sm:text-6xl lg:text-7xl'>
            Premium Care for
            <br />
            <span className='gradient-text'>Your Beloved</span> Pets
          </motion.h1>

          <motion.p variants={fadeUp} initial='hidden' animate='visible' custom={2} className='mt-6 max-w-xl text-lg leading-8 text-muted'>
            Connect with certified veterinarians, track vaccinations, get AI-powered health insights, and manage your pet's complete medical history — all in one beautiful platform.
          </motion.p>

          <motion.div variants={fadeUp} initial='hidden' animate='visible' custom={3} className='mt-10 flex flex-wrap gap-4'>
            <Link to='/register' className='mf-button group px-8 py-4 text-base'>
              Start Free Today
              <ArrowRight className='ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
            </Link>
            <Link to='/login' className='mf-button-secondary px-8 py-4 text-base'>
              Sign In
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} initial='hidden' animate='visible' custom={4} className='mt-10 flex items-center gap-6'>
            <div className='flex -space-x-3'>
              {['M', 'L', 'B'].map((initial, i) => (
                <div key={initial} className={`grid h-10 w-10 place-items-center rounded-full ${['bg-primary', 'bg-secondary', 'bg-accent'][i]} text-sm font-bold text-white ring-4 ring-background`}>
                  {initial}
                </div>
              ))}
            </div>
            <div>
              <div className='flex items-center gap-1'>
                {[...Array(5)].map((_, i) => <Star key={i} className='h-3.5 w-3.5 fill-accent text-accent' />)}
              </div>
              <p className='mt-1 text-sm text-muted'><span className='font-semibold text-ink'>10,000+</span> pet owners trust MEDFLOW AI</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className='relative'
        >
          <div className='relative mx-auto max-w-md lg:max-w-none'>
            <div className='relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/80 p-3 shadow-soft-xl backdrop-blur-xl'>
              <img
                src={assets.hero_pet}
                alt='Happy dog enjoying premium pet care'
                className='h-[420px] w-full rounded-[2rem] object-cover lg:h-[500px]'
              />
              <div className='absolute bottom-3 left-3 right-3 rounded-b-[2rem] bg-gradient-to-t from-ink/58 to-transparent p-6 pt-24'>
                <p className='text-lg font-semibold text-white drop-shadow'>Every companion deserves the best care</p>
                <p className='mt-1 text-sm text-white/80'>24/7 AI monitoring with clinician-ready context</p>
              </div>
            </div>

            {floatingCards.map((card) => (
              <motion.div
                key={card.label}
                className={`absolute ${card.className}`}
                animate={{ y: [0, card.distance, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
              >
                <div className='glass-card flex max-w-[238px] items-center gap-3 p-4 shadow-soft-xl'>
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${card.tone}`}>
                    <card.icon className='h-5 w-5' />
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted'>{card.label}</p>
                    <p className='text-sm font-bold text-ink'>{card.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2'
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            >
              <div className='glass-card flex items-center gap-3 p-3 shadow-soft-xl'>
                <div className='grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100/70'>
                  <CalendarCheck className='h-5 w-5 text-emerald-600' />
                </div>
                <p className='text-sm font-bold text-ink'>Book a Vet Visit</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Header