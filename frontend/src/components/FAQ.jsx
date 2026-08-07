import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'How does AI work in MedFlow AI?',
    answer: 'MedFlow AI uses artificial intelligence to analyze your pet\'s health records, vaccination history, and medical timeline. It generates preliminary summaries and insights that help you understand your pet\'s health and prepare for veterinary consultations. AI reports are designed to support, not replace, professional veterinary advice.'
  },
  {
    question: 'Can AI diagnose diseases?',
    answer: 'No. MedFlow AI does not diagnose diseases. Our AI provides preliminary health insights and educational summaries based on the records you and your veterinarian maintain. A licensed veterinarian must always make the final diagnosis and treatment decisions for your pet.'
  },
  {
    question: 'How do vaccinations work?',
    answer: 'MedFlow AI helps you track your pet\'s vaccination schedule, record completed doses, and stay informed about upcoming boosters. You can view vaccine history, due dates, and veterinarian notes all in one timeline, so you never miss an important preventive-care milestone.'
  },
  {
    question: 'How do appointments work?',
    answer: 'Browse our directory of certified veterinarians, filter by specialty or species, and check live availability. Once you find the right veterinarian, you can book an appointment, receive confirmation, and manage or cancel bookings from your dashboard.'
  }
]

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className='py-16 sm:py-20'>
      <div className='text-center max-w-3xl mx-auto'>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='text-xs font-bold uppercase tracking-[0.15em] text-primary'
        >
          Frequently asked questions
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className='mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl'
        >
          Everything you need to know
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className='mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-muted'
        >
          Answers to common questions about MedFlow AI, AI health insights, vaccinations, and appointments.
        </motion.p>
      </div>
      <div className='mt-12 mx-auto max-w-3xl space-y-3'>
        {faqs.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
          >
            <article className='overflow-hidden rounded-2xl border border-line/60 bg-white shadow-soft'>
              <button
                type='button'
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className='flex w-full items-center justify-between gap-4 px-6 py-5 text-left'
                aria-expanded={openIndex === index}
              >
                <span className='font-semibold text-ink'>{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className='h-5 w-5 text-muted' />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    key='content'
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className='border-t border-line/60 px-6 py-5'
                  >
                    <p className='text-base leading-relaxed text-muted'>{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default FAQ
