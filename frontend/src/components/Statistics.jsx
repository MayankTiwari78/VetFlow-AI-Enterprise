import React from 'react'

const stats = [
  { icon: '🐾', value: '12,500+', label: 'Pets Registered' },
  { icon: '💉', value: '48,200+', label: 'Vaccinations Completed' },
  { icon: '👨‍⚕️', value: '350+', label: 'Veterinarians' },
  { icon: '📅', value: '96,800+', label: 'Appointments' },
  { icon: '🤖', value: '28,400+', label: 'AI Reports' }
]

const Statistics = () => (
  <section className='mf-section'>
    <div className='max-w-3xl'>
      <p className='mf-eyebrow'>VetFlow AI in numbers</p>
      <h2 className='mf-title'>Trusted by pet families everywhere</h2>
      <p className='mf-copy'>From first registration to lifelong wellness, pet owners rely on VetFlow AI to keep every companion healthy and happy.</p>
    </div>
    <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
      {stats.map((stat) => (
        <article key={stat.label} className='mf-card p-6 text-center'>
          <span className='mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E7F4F5] text-2xl' aria-hidden='true'>{stat.icon}</span>
          <p className='mt-4 text-3xl font-bold text-primary'>{stat.value}</p>
          <p className='mt-1 text-sm font-semibold text-ink'>{stat.label}</p>
        </article>
      ))}
    </div>
  </section>
)

export default Statistics