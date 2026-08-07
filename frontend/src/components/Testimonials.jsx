import React from 'react'

const testimonials = [
  {
    quote: 'VetFlow AI made it so easy to keep track of my dog\'s vaccinations. I never miss a booster now, and the AI reports help me understand what the vet is saying.',
    name: 'Sarah Mitchell',
    role: 'Pet owner of a Golden Retriever',
    pet: '🐕'
  },
  {
    quote: 'Booking appointments with a certified veterinarian has never been simpler. The medical timeline keeps everything organized, and my cat\'s records are always at hand.',
    name: 'James Rodriguez',
    role: 'Pet owner of two cats',
    pet: '🐈'
  },
  {
    quote: 'The AI health insights are incredible. They helped me prepare for my rabbit\'s check-up with the right questions, and the veterinarian was impressed with how informed I was.',
    name: 'Priya Sharma',
    role: 'Pet owner of a rabbit',
    pet: '🐇'
  }
]

const Testimonials = () => (
  <section className='mf-section'>
    <div className='flex flex-col items-center gap-2 text-center'>
      <p className='mf-eyebrow'>Pet owner stories</p>
      <h2 className='mf-title'>Loved by pet families</h2>
      <p className='mf-copy'>Hear from pet owners who trust VetFlow AI for their companions\' health and wellness.</p>
    </div>
    <div className='mt-8 grid gap-4 md:grid-cols-3'>
      {testimonials.map((testimonial) => (
        <article key={testimonial.name} className='mf-card flex flex-col p-6'>
          <span className='text-3xl' aria-hidden='true'>{testimonial.pet}</span>
          <p className='mt-4 text-sm leading-7 text-slate-600'>"{testimonial.quote}"</p>
          <div className='mt-6 border-t border-line pt-4'>
            <p className='font-semibold text-ink'>{testimonial.name}</p>
            <p className='mt-1 text-xs text-slate-500'>{testimonial.role}</p>
          </div>
        </article>
      ))}
    </div>
  </section>
)

export default Testimonials