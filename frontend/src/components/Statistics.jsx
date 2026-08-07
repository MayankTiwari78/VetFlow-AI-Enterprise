import React from 'react'
import { motion } from 'framer-motion'
import { Users, Stethoscope, Smile, Activity } from 'lucide-react'

const stats = [
  { icon: Users, value: '10,000+', label: 'Pet Owners', color: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
  { icon: Stethoscope, value: '650+', label: 'Veterinarians', color: 'from-secondary/10 to-secondary/5', iconColor: 'text-secondary' },
  { icon: Smile, value: '99%', label: 'Satisfaction', color: 'from-accent/10 to-accent/5', iconColor: 'text-accent' },
  { icon: Activity, value: '24/7', label: 'AI Monitoring', color: 'from-primary/10 to-accent/5', iconColor: 'text-primary' },
]

const Statistics = () => (
  <section className='py-16 sm:py-20'>
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <article className='group relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-8 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover'>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className='relative z-10'>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${stat.color} ${stat.iconColor}`}>
                <stat.icon className='h-6 w-6' strokeWidth={1.5} />
              </div>
              <p className='mt-5 text-4xl font-bold text-ink'>{stat.value}</p>
              <p className='mt-2 text-sm font-medium text-muted'>{stat.label}</p>
            </div>
          </article>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Statistics
