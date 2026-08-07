const AuthShell = ({ eyebrow, title, description, children }) => (
  <div className='min-h-[72vh] py-12 sm:py-16'>
    <div className='mx-auto grid max-w-4xl overflow-hidden rounded-lg border border-line bg-white shadow-[0_18px_50px_rgba(21,48,72,0.10)] md:grid-cols-[.85fr_1.15fr]'>
      <aside className='flex flex-col justify-between bg-ink p-7 text-white sm:p-9'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.14em] text-[#74D9D0]'>Protected access</p>
          <h2 className='mt-4 text-3xl font-semibold leading-tight'>Your pet care account stays yours.</h2>
          <p className='mt-4 text-sm leading-6 text-slate-300'>Identity checks, expiring links, and secure sessions help protect every step.</p>
        </div>
        <p className='mt-10 text-xs text-slate-400'>VetFlow AI account security</p>
      </aside>
      <main className='p-7 sm:p-9'>
        <p className='mf-eyebrow'>{eyebrow}</p>
        <h1 className='mt-2 text-3xl font-semibold text-ink'>{title}</h1>
        {description && <p className='mt-3 text-sm leading-6 text-slate-600'>{description}</p>}
        <div className='mt-7'>{children}</div>
      </main>
    </div>
  </div>
)

export default AuthShell
