const BrandLogo = ({ onClick, compact = false }) => {
  const content = (
    <>
      <span className='relative grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-sm font-bold text-white'>
        MF
        <span className='absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-teal' />
      </span>
      <span className='text-left leading-none'>
        <span className='block text-xl font-bold text-ink'>MedFlow <span className='text-teal'>AI</span></span>
        {!compact && <span className='mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Connected veterinary care</span>}
      </span>
    </>
  )

  return onClick ? (
    <button type='button' onClick={onClick} className='flex items-center gap-3' aria-label='Go to MedFlow AI home'>
      {content}
    </button>
  ) : <div className='flex items-center gap-3'>{content}</div>
}

export default BrandLogo
