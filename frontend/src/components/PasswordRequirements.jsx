export const PasswordRequirements = ({ password, requirements, strength }) => {
  if (!password) return null
  const strengthColor =
    strength.level === 'strong'
      ? 'text-emerald-700'
      : strength.level === 'medium'
        ? 'text-amber-700'
        : 'text-red-700'
  return (
    <div className='mt-2 rounded-[14px] border border-line/70 bg-white/70 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-xs font-bold uppercase tracking-[0.08em] text-muted'>Password requirements</p>
        {strength.label ? (
          <span className={`text-xs font-extrabold ${strengthColor}`}>Strength: {strength.label}</span>
        ) : null}
      </div>
      <ul className='mt-2 grid gap-1 text-xs font-semibold'>
        {requirements.map((item) => (
          <li key={item.key} className={item.met ? 'text-emerald-700' : 'text-slate-500'}>
            <span aria-hidden='true'>{item.met ? '✓' : '○'} </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}