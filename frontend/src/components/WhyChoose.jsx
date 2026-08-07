import React from 'react'
import { motion } from 'framer-motion'
import { UserPlus, PawPrint, Stethoscope, ArrowRight } from 'lucide-react'

const steps = [
  { icon: UserPlus, title: 'Register', copy: 'Create your free account in under a minute. Set up your profile and connect with trusted veterinarians.', step: '01', color: 'from-primary/10 to-primary/5' },
  { icon: PawPrint, title: 'Add Pets', copy: 'Add your pets with their medical history, vaccination records, and unique health needs. All in one place.', step: '02', color: 'from-secondary/10 to-secondary/5' },
  { icon: Stethoscope, title: 'Consult Vet', copy: 'Book appointments, get AI-powered health insights, and stay connected with your veterinary care team.', step: '03', color: 'from-accent/10 to-accent/5' },
]

const WhyChoose = () => (
  <section className='py-16 sm:py-20'>
    <div className='text-center max-w-3xl mx-auto'>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='text-xs font-bold uppercase tracking-[0.15em] text-primary'
      >
        How it works
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className='mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl'
      >
        Three simple steps to better pet care
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-muted'
      >
        From registration to consultation, we make pet healthcare seamless and stress-free.
      </motion.p>
    </div>
    <div className='mt-12 grid gap-8 md:grid-cols-3'>
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.15, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className='relative'
        >
          <div className='group relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-8 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover'>
            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className='relative z-10'>
              <span className='text-4xl font-black text-primary/20'>{step.step}</span>
              <div className={`mt-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${step.color} text-primary`}>
                <step.icon className='h-6 w-6' strokeWidth={1.5} />
              </div>
              <h3 className='mt-6 text-xl font-bold text-ink'>{step.title}</h3>
              <p className='mt-3 text-base leading-relaxed text-muted'>{step.copy}</p>
              {index < steps.length - 1 && (
                <ArrowRight className='hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted/30' strokeWidth={1} />
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
)

export default WhyChoose
