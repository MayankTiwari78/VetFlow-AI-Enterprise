import { describe, expect, it, vi } from 'vitest'

// Mock the assets module so image imports resolve to string URLs
const mockAssets = {}
for (let i = 1; i <= 15; i++) {
  mockAssets[`doc${i}`] = `http://localhost:3000/doc${i}.png`
}
mockAssets.dr_meera_rao = 'http://localhost:3000/DR.Meera Rao.jpeg'
mockAssets.dr_arjun_sen = 'http://localhost:3000/DR.Arjun Sen.jpeg'
mockAssets.dr_priya_nair = 'http://localhost:3000/priya Nair.png'
mockAssets.dr_vikram_singh = 'http://localhost:3000/DR.Vikram Singh.jpeg'
mockAssets.dr_ananya_iyer = 'http://localhost:3000/DR.Ananya Iyer.jpeg'
mockAssets.dr_rohan_gupta = 'http://localhost:3000/DR.Rohan Gupta.jpeg'
mockAssets.dr_kavya_menon = 'http://localhost:3000/DR.Kavya Menon.jpeg'
mockAssets.dr_aditya_kumar = 'http://localhost:3000/DR. Aditya kumar.jpeg'
mockAssets.dr_divya_sharma = 'http://localhost:3000/DR.Divya Sharma.jpeg'
mockAssets.dr_sneha_patel = 'http://localhost:3000/DR.Sneha Patel.jpeg'
mockAssets.dr_rahul_verma = 'http://localhost:3000/DR.Rahul Verma.jpeg'
mockAssets.dr_nikhil_joshi = 'http://localhost:3000/DR.Nikhil Joshi.jpeg'

vi.mock('../assets/assets', () => ({
  assets: mockAssets
}))

const { vetAvatarFor, normalizeDoctors, cleanVetName } = await import('./veterinaryDisplay')

describe('vetAvatarFor - veterinary doctor image mapping', () => {
  const DEMO_PREFIX = '[Demo data] '

  const vetDoctors = [
    { name: DEMO_PREFIX + 'Dr. Meera Rao', speciality: 'General Veterinary Medicine' },
    { name: DEMO_PREFIX + 'Dr. Arjun Sen', speciality: 'Small Animal Surgery' },
    { name: DEMO_PREFIX + 'Dr. Priya Nair', speciality: 'Veterinary Dermatology' },
    { name: DEMO_PREFIX + 'Dr. Vikram Singh', speciality: 'Veterinary Cardiology' },
    { name: DEMO_PREFIX + 'Dr. Ananya Iyer', speciality: 'Veterinary Orthopedics' },
    { name: DEMO_PREFIX + 'Dr. Rohan Gupta', speciality: 'Veterinary Dentistry' },
    { name: DEMO_PREFIX + 'Dr. Kavya Menon', speciality: 'Veterinary Ophthalmology' },
    { name: DEMO_PREFIX + 'Dr. Aditya Kumar', speciality: 'Veterinary Neurology' },
    { name: DEMO_PREFIX + 'Dr. Sneha Patel', speciality: 'Veterinary Oncology' },
    { name: DEMO_PREFIX + 'Dr. Rahul Verma', speciality: 'Veterinary Internal Medicine' },
    { name: DEMO_PREFIX + 'Dr. Divya Sharma', speciality: 'Emergency & Critical Care' },
    { name: DEMO_PREFIX + 'Dr. Nikhil Joshi', speciality: 'Exotic Animal Medicine' }
  ]

  const expectedImages = {
    'Dr. Meera Rao': 'http://localhost:3000/DR.Meera Rao.jpeg',
    'Dr. Arjun Sen': 'http://localhost:3000/DR.Arjun Sen.jpeg',
    'Dr. Priya Nair': 'http://localhost:3000/priya Nair.png',
    'Dr. Vikram Singh': 'http://localhost:3000/DR.Vikram Singh.jpeg',
    'Dr. Ananya Iyer': 'http://localhost:3000/DR.Ananya Iyer.jpeg',
    'Dr. Rohan Gupta': 'http://localhost:3000/DR.Rohan Gupta.jpeg',
    'Dr. Kavya Menon': 'http://localhost:3000/DR.Kavya Menon.jpeg',
    'Dr. Aditya Kumar': 'http://localhost:3000/DR. Aditya kumar.jpeg',
    'Dr. Sneha Patel': 'http://localhost:3000/DR.Sneha Patel.jpeg',
    'Dr. Rahul Verma': 'http://localhost:3000/DR.Rahul Verma.jpeg',
    'Dr. Divya Sharma': 'http://localhost:3000/DR.Divya Sharma.jpeg',
    'Dr. Nikhil Joshi': 'http://localhost:3000/DR.Nikhil Joshi.jpeg'
  }

  it('maps all 12 veterinary doctors to their correct portrait images', () => {
    vetDoctors.forEach((doctor) => {
      const cleanedName = cleanVetName(doctor.name)
      const image = vetAvatarFor(doctor)
      expect(image).toBe(expectedImages[cleanedName])
    })
  })

  it('returns correct images through normalizeDoctors pipeline', () => {
    const normalized = normalizeDoctors(vetDoctors)
    expect(normalized).toHaveLength(12)
    normalized.forEach((doc) => {
      expect(doc.image).toBe(expectedImages[doc.name])
    })
  })

  it('does not return the default SVG placeholder for any veterinary doctor', () => {
    const normalized = normalizeDoctors(vetDoctors)
    normalized.forEach((doc) => {
      expect(doc.image).not.toContain('data:image/svg+xml')
    })
  })

  it('does not return generic doc1-doc15 fallback images for veterinary doctors', () => {
    const normalized = normalizeDoctors(vetDoctors)
    const fallbackImages = [
      'http://localhost:3000/doc1.png',
      'http://localhost:3000/doc2.png',
      'http://localhost:3000/doc3.png',
      'http://localhost:3000/doc4.png',
      'http://localhost:3000/doc5.png',
      'http://localhost:3000/doc6.png',
      'http://localhost:3000/doc7.png',
      'http://localhost:3000/doc8.png',
      'http://localhost:3000/doc9.png',
      'http://localhost:3000/doc10.png',
      'http://localhost:3000/doc11.png',
      'http://localhost:3000/doc12.png',
      'http://localhost:3000/doc13.png',
      'http://localhost:3000/doc14.png',
      'http://localhost:3000/doc15.png'
    ]
    normalized.forEach((doc) => {
      expect(fallbackImages).not.toContain(doc.image)
    })
  })
})
