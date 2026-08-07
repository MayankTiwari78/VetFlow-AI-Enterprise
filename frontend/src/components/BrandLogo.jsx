import { Activity } from 'lucide-react'

const BrandLogo = ({ onClick, compact = false }) => {
  const content = (
    <>
      <span className='relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-bg text-white shadow-soft-lg'>
        <Activity className='h-5 w-5' strokeWidth={2.5} />
        <span className='absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent' />
      </span>
      <span className='text-left leading-none'>
        <span className='block text-xl font-extrabold text-ink'>MEDFLOW <span className='gradient-text'>AI</span></span>
        {!compact && <span className='mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted'>AI Powered Veterinary Healthcare Platform</span>}
      </span>
    </>
  )

  return onClick ? (
    <button type='button' onClick={onClick} className='flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]' aria-label='Go to MedFlow AI home'>
      {content}
    </button>
  ) : <div className='flex items-center gap-3'>{content}</div>
}

export default BrandLogo
