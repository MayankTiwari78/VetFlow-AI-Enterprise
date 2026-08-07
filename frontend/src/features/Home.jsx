import React from 'react'
import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'
import PetServices from '../components/PetServices'
import Statistics from '../components/Statistics'
import WhyChoose from '../components/WhyChoose'
import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'

const Home = () => {
  return (
    <div>
      <Header />
      <PetServices />
      <Statistics />
      <SpecialityMenu />
      <TopDoctors />
      <WhyChoose />
      <Testimonials />
      <FAQ />
      <Banner />
    </div>
  )
}

export default Home