import React from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { Link } from '../lib/routerCompat'

const plans = [
  {
    name: 'Pet Owner',
    price: '$12',
    copy: 'For families managing everyday pet health.',
    features: ['AI health summaries', 'Vaccination reminders', 'Medical timeline', 'Appointment booking']
  },
  {
    name: 'Clinic',
    price: '$79',
    copy: 'For veterinary teams coordinating digital care.',
    features: ['Clinic-ready records', 'Owner coordination', 'Priority appointment tools', 'Emergency access notes'],
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    copy: 'For multi-location veterinary networks.',
    features: ['Advanced analytics', 'Dedicated onboarding', 'Configurable workflows', 'Premium support']
  }
]

const Pricing = () => (
  <section id='pricing' className='py-16 sm:py-20'>
    <div className='mx-auto max-w-3xl text-center'>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='mf-eyebrow'
      >
        Pricing
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className='mf-title'
      >
        Premium care plans that scale with you
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='mx-auto mf-copy'
      >
        Simple options for pet families, growing clinics, and veterinary networks building a connected care experience.
      </motion.p>
    </div>

    <div className='mt-12 grid gap-5 lg:grid-cols-3'>
      {plans.map((plan, index) => (
        <motion.article
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className={`relative overflow-hidden rounded-[28px] border p-7 shadow-soft backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
            plan.featured
              ? 'border-primary/25 bg-ink text-white'
              : 'border-white/70 bg-white/80 text-ink'
          }`}
        >
          {plan.featured && (
            <span className='mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-accent'>
              <Sparkles className='h-3.5 w-3.5' />
              Most popular
            </span>
          )}
          <h3 className='text-2xl font-black'>{plan.name}</h3>
          <p className={`mt-3 min-h-12 text-sm leading-6 ${plan.featured ? 'text-white/70' : 'text-muted'}`}>{plan.copy}</p>
          <div className='mt-7 flex items-end gap-2'>
            <span className='text-5xl font-black'>{plan.price}</span>
            {plan.price !== 'Custom' && <span className={`pb-2 text-sm font-semibold ${plan.featured ? 'text-white/60' : 'text-muted'}`}>/mo</span>}
          </div>
          <ul className='mt-7 space-y-3'>
            {plan.features.map((feature) => (
              <li key={feature} className={`flex items-center gap-3 text-sm font-semibold ${plan.featured ? 'text-white/90' : 'text-ink'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${plan.featured ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
                  <Check className='h-3.5 w-3.5' />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link to={plan.featured ? '/register' : '/login'} className={`mt-8 w-full ${plan.featured ? 'mf-button bg-white text-ink' : 'mf-button-secondary'}`}>
            {plan.featured ? 'Get Started' : 'Choose Plan'}
          </Link>
        </motion.article>
      ))}
    </div>
  </section>
)

export default Pricing
