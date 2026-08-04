import React from 'react'
import { specialityData } from '../assets/assets'
import { Link } from '../lib/routerCompat'

const SpecialityMenu = () => {
    return (
        <section id='speciality' className='mf-section'>
            <div className='flex flex-col items-center gap-2 text-center'>
              <p className='mf-eyebrow'>Start with what you need</p>
              <h2 className='mf-title'>Care across every speciality</h2>
              <p className='mf-copy'>Browse experienced clinicians and move from discovery to booking in a few calm, clear steps.</p>
            </div>
            <div className='mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
                {specialityData.map((item, index) => (
                    <Link to={`/doctors/${item.speciality}`} onClick={() => scrollTo(0, 0)} className='mf-card flex min-h-36 flex-col items-center justify-center gap-3 px-3 py-5 text-center text-sm font-semibold text-ink transition duration-200 hover:-translate-y-1 hover:border-teal' key={index}>
                        <img className='w-14 sm:w-16' src={item.image} alt="" />
                        <p>{item.speciality}</p>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export default SpecialityMenu
