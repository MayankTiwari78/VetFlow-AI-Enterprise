import React from 'react'

const services = [
  { icon: '🐶', title: 'Pet Registration', copy: 'Create a secure profile for every pet and keep essential details ready for veterinary care.' },
  { icon: '💉', title: 'Vaccination Tracking', copy: 'Follow vaccine history, due dates, and preventive-care milestones in one timeline.' },
  { icon: '🩺', title: 'Medical Records', copy: 'Keep veterinary visits, diagnoses, prescriptions, and reports organized and accessible.' },
  { icon: '🤖', title: 'AI Health Analysis', copy: 'Use AI-assisted insights to understand pet health information and prepare for veterinary care.' },
  { icon: '📅', title: 'Appointment Booking', copy: 'Discover the right veterinarian, check availability, and book care with confidence.' },
  { icon: '👨‍⚕️', title: 'Find Veterinarians', copy: 'Browse certified veterinarians by species and specialty to find the perfect match for your pet.' }
]

const PetServices = () => (
  <section className='mf-section'>
    <div className='max-w-3xl'>
      <p className='mf-eyebrow'>Every stage of pet care</p>
      <h2 className='mf-title'>One connected home for healthier pets</h2>
      <p className='mf-copy'>From a new pet profile to ongoing veterinary care, VetFlow AI keeps the information pet owners and care teams need close at hand.</p>
    </div>
    <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {services.map((service) => (
        <article key={service.title} className='mf-card p-5'>
          <span className='grid h-12 w-12 place-items-center rounded-lg bg-[#E7F4F5] text-2xl' aria-hidden='true'>{service.icon}</span>
          <h3 className='mt-5 text-lg font-semibold text-ink'>{service.title}</h3>
          <p className='mt-2 text-sm leading-6 text-slate-600'>{service.copy}</p>
        </article>
      ))}
    </div>
  </section>
)

export default PetServices