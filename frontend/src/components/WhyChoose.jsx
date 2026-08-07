import React from 'react'

const reasons = [
  { icon: '🤖', title: 'AI Assisted Reports', copy: 'Get AI-powered summaries that help you understand your pet\'s health information and prepare for veterinary visits.' },
  { icon: '👨‍⚕️', title: 'Certified Veterinarians', copy: 'Connect with licensed and experienced veterinarians across every specialty your companion may need.' },
  { icon: '💉', title: 'Vaccination Tracking', copy: 'Never miss a booster. Follow vaccine schedules, due dates, and preventive-care milestones in one timeline.' },
  { icon: '📋', title: 'Medical Timeline', copy: 'Keep every diagnosis, prescription, and treatment record organized in a clear, chronological pet health history.' },
  { icon: '🔒', title: 'Secure Records', copy: 'Your pet\'s medical data is protected with enterprise-grade security and strict privacy controls.' },
  { icon: '📅', title: 'Appointment Booking', copy: 'Find the right veterinarian, check live availability, and book appointments in just a few clicks.' }
]

const WhyChoose = () => (
  <section className='mf-section'>
    <div className='max-w-3xl'>
      <p className='mf-eyebrow'>Why choose VetFlow AI</p>
      <h2 className='mf-title'>Pet care that puts you and your companion first</h2>
      <p className='mf-copy'>We combine modern technology with trusted veterinary expertise so every pet gets the care they deserve.</p>
    </div>
    <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {reasons.map((reason) => (
        <article key={reason.title} className='mf-card p-6'>
          <span className='grid h-12 w-12 place-items-center rounded-lg bg-[#E7F4F5] text-2xl' aria-hidden='true'>{reason.icon}</span>
          <h3 className='mt-5 text-lg font-semibold text-ink'>{reason.title}</h3>
          <p className='mt-2 text-sm leading-6 text-slate-600'>{reason.copy}</p>
        </article>
      ))}
    </div>
  </section>
)

export default WhyChoose