import React from 'react'
import Header from '../components/Header'
import PetServices from '../components/PetServices'
import Statistics from '../components/Statistics'
import WhyChoose from '../components/WhyChoose'
import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'
import Banner from '../components/Banner'
import Pricing from '../components/Pricing'

const Home = () => {
  return (
    <div>
      <Header />
      <Statistics />
      <PetServices />
      <WhyChoose />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Banner />
    </div>
  )
}

export default Home
