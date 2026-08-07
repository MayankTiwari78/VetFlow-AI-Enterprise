import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Syringe, Stethoscope, Brain, Calendar, Siren } from 'lucide-react'

const services = [
  { icon: FileText, title: 'AI Health Reports', copy: 'Get AI-powered summaries that help you understand your pet\'s health information and prepare for veterinary visits.', color: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
  { icon: Stethoscope, title: 'Medical Timeline', copy: 'Keep every diagnosis, prescription, and treatment record organized in a clear, chronological pet health history.', color: 'from-secondary/10 to-secondary/5', iconColor: 'text-secondary' },
  { icon: Syringe, title: 'Vaccinations', copy: 'Never miss a booster. Follow vaccine schedules, due dates, and preventive-care milestones in one timeline.', color: 'from-accent/10 to-accent/5', iconColor: 'text-accent' },
  { icon: Calendar, title: 'Appointments', copy: 'Discover the right veterinarian, check live availability, and book appointments in just a few clicks.', color: 'from-secondary/10 to-accent/5', iconColor: 'text-secondary' },
  { icon: Stethoscope, title: 'Chat with Vet', copy: 'Keep pet owners and veterinary care teams aligned with clear context before and after each appointment.', color: 'from-primary/10 to-secondary/5', iconColor: 'text-primary' },
  { icon: Siren, title: 'Emergency Records', copy: 'Make critical allergies, recent visits, medications, and owner contact details easier to access when care is urgent.', color: 'from-rose-50 to-primary/5', iconColor: 'text-rose-500' },
  { icon: Brain, title: 'Health Analytics', copy: 'Use AI-assisted insights to understand pet health information and prepare for veterinary care confidently.', color: 'from-primary/10 to-secondary/5', iconColor: 'text-primary' },
]

const PetServices = () => (
  <section id='features' className='py-16 sm:py-20'>
    <div className='text-center max-w-3xl mx-auto'>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='text-xs font-bold uppercase tracking-[0.15em] text-primary'
      >
        Every stage of pet care
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className='mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl'
      >
        One connected home for healthier pets
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-muted'
      >
        From a new pet profile to ongoing veterinary care, MedFlow AI keeps the information pet owners and care teams need close at hand.
      </motion.p>
    </div>
    <div className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
      {services.map((service, index) => (
        <motion.div
          key={service.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <article className='group relative min-h-[246px] overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-7 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover'>
            <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className='relative z-10'>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${service.color} ${service.iconColor}`}>
                <service.icon className='h-6 w-6' strokeWidth={1.5} />
              </div>
              <h3 className='mt-6 text-xl font-bold text-ink'>{service.title}</h3>
              <p className='mt-3 text-base leading-relaxed text-muted'>{service.copy}</p>
            </div>
          </article>
        </motion.div>
      ))}
    </div>
  </section>
)

export default PetServices
