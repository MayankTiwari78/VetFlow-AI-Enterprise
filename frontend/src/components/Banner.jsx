import React from 'react'
import { motion } from 'framer-motion'
import { assets } from '../assets/assets'
import { useNavigate } from '../lib/routerCompat'
import { ArrowRight } from 'lucide-react'

const Banner = () => {
  const navigate = useNavigate()

  return (
    <section className='relative isolate overflow-hidden rounded-[32px] bg-ink py-16 shadow-soft-xl sm:py-24'>
      <div className='absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(15,157,138,0.34),rgba(15,23,42,0.96)_42%,rgba(56,217,169,0.24))]' />

      <div className='grid items-center gap-12 px-6 sm:px-10 lg:grid-cols-[1fr_0.8fr]'>
        {/* Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <h2 className='text-4xl font-extrabold leading-tight text-white sm:text-5xl'>
            Give every pet a healthier <span className='text-accent'>tomorrow.</span>
          </h2>
          <p className='mt-4 max-w-lg text-lg text-white/80'>
            Join thousands of pet families who trust MedFlow AI for connected veterinary care, AI-powered insights, and seamless appointment management.
          </p>
          <motion.button
            whileHover={{ scale: 1.02, x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { navigate('/pet-owner/pets/register'); scrollTo(0, 0) }}
            className='mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-ink shadow-soft-lg transition-all duration-200 hover:shadow-soft-xl'
          >
            Register your pet
            <ArrowRight className='h-4 w-4' />
          </motion.button>
        </motion.div>

        {/* Right Side */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className='relative hidden md:block'
        >
          <img
            className='h-full w-full object-contain'
            src={assets.veterinary_care}
            alt="Pet wellness illustration"
          />
        </motion.div>
      </div>
    </section>
  )
}

export default Banner
