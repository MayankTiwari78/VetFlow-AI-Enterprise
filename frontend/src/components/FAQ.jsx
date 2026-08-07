import React, { useState } from 'react'

const faqs = [
  {
    question: 'How does AI work in VetFlow AI?',
    answer: 'VetFlow AI uses artificial intelligence to analyze your pet\'s health records, vaccination history, and medical timeline. It generates preliminary summaries and insights that help you understand your pet\'s health and prepare for veterinary consultations. AI reports are designed to support, not replace, professional veterinary advice.'
  },
  {
    question: 'Can AI diagnose diseases?',
    answer: 'No. VetFlow AI does not diagnose diseases. Our AI provides preliminary health insights and educational summaries based on the records you and your veterinarian maintain. A licensed veterinarian must always make the final diagnosis and treatment decisions for your pet.'
  },
  {
    question: 'How do vaccinations work?',
    answer: 'VetFlow AI helps you track your pet\'s vaccination schedule, record completed doses, and stay informed about upcoming boosters. You can view vaccine history, due dates, and veterinarian notes all in one timeline, so you never miss an important preventive-care milestone.'
  },
  {
    question: 'How do appointments work?',
    answer: 'Browse our directory of certified veterinarians, filter by specialty or species, and check live availability. Once you find the right veterinarian, you can book an appointment, receive confirmation, and manage or cancel bookings from your dashboard.'
  }
]

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className='mf-section'>
      <div className='max-w-3xl'>
        <p className='mf-eyebrow'>Frequently asked questions</p>
        <h2 className='mf-title'>Everything you need to know</h2>
        <p className='mf-copy'>Answers to common questions about VetFlow AI, AI health insights, vaccinations, and appointments.</p>
      </div>
      <div className='mt-8 space-y-3'>
        {faqs.map((faq, index) => (
          <article key={faq.question} className='mf-card overflow-hidden'>
            <button
              type='button'
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              className='flex w-full items-center justify-between gap-4 px-6 py-5 text-left'
              aria-expanded={openIndex === index}
            >
              <span className='font-semibold text-ink'>{faq.question}</span>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E7F4F5] text-lg text-primary transition-transform duration-200 ${openIndex === index ? 'rotate-45' : ''}`} aria-hidden='true'>+</span>
            </button>
            {openIndex === index && (
              <div className='border-t border-line px-6 py-5'>
                <p className='text-sm leading-7 text-slate-600'>{faq.answer}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export default FAQ