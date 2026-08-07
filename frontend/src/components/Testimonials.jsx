import React from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const testimonials = [
  {
    quote: 'MedFlow AI made it so easy to keep track of my dog\'s vaccinations. I never miss a booster now, and the AI reports help me understand what the vet is saying.',
    name: 'Sarah Mitchell',
    role: 'Pet owner of a Golden Retriever',
    initials: 'SM',
    color: 'from-primary/10 to-primary/5'
  },
  {
    quote: 'Booking appointments with a certified veterinarian has never been simpler. The medical timeline keeps everything organized, and my cat\'s records are always at hand.',
    name: 'James Rodriguez',
    role: 'Pet owner of two cats',
    initials: 'JR',
    color: 'from-secondary/10 to-secondary/5'
  },
  {
    quote: 'The AI health insights are incredible. They helped me prepare for my rabbit\'s check-up with the right questions, and the veterinarian was impressed with how informed I was.',
    name: 'Priya Sharma',
    role: 'Pet owner of a rabbit',
    initials: 'PS',
    color: 'from-accent/10 to-accent/5'
  }
]

const Testimonials = () => (
  <section className='py-16 sm:py-20'>
    <div className='text-center max-w-3xl mx-auto'>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='text-xs font-bold uppercase tracking-[0.15em] text-primary'
      >
        Pet owner stories
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className='mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl'
      >
        Loved by pet families
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-muted'
      >
        Hear from pet owners who trust MedFlow AI for their companions' health and wellness.
      </motion.p>
    </div>
    <div className='mt-12 grid gap-6 md:grid-cols-3'>
      {testimonials.map((testimonial, index) => (
        <motion.div
          key={testimonial.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <article className='group relative min-h-[350px] overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-8 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover'>
            <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className='relative z-10'>
              <div className='flex items-center gap-1 mb-5'>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className='h-4 w-4 fill-accent text-accent' strokeWidth={0} />
                ))}
              </div>
              <p className='text-base leading-relaxed text-muted'>&quot;{testimonial.quote}&quot;</p>
              <div className='mt-6 flex items-center gap-4 pt-4 border-t border-line/60'>
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${testimonial.color} text-sm font-bold text-primary`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className='font-semibold text-ink'>{testimonial.name}</p>
                  <p className='text-xs text-muted'>{testimonial.role}</p>
                </div>
              </div>
            </div>
          </article>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Testimonials
