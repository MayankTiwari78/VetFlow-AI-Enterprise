import { assets } from '../assets/assets'

const DEMO_PREFIX = '[Demo data] '
const DEMO_MARKERS = ['Demo data', 'demo', 'fictional', 'placeholder']

const specialityMap = {
  'General Veterinary Medicine': 'General Veterinary Medicine',
  'Small Animal Surgery': 'Veterinary Surgery',
  'Veterinary Dermatology': 'Veterinary Dermatology',
  'Veterinary Cardiology': 'Veterinary Cardiology',
  'Veterinary Orthopedics': 'Veterinary Orthopedics',
  'Veterinary Dentistry': 'Veterinary Dentistry',
  'Veterinary Ophthalmology': 'Veterinary Ophthalmology',
  'Veterinary Neurology': 'Veterinary Neurology',
  'Veterinary Oncology': 'Veterinary Oncology',
  'Veterinary Internal Medicine': 'Internal Medicine',
  'Emergency & Critical Care': 'Emergency & Critical Care',
  'Exotic Animal Medicine': 'Exotic Pet Medicine',
  'Dog Specialist': 'Canine Medicine',
  'Cat Specialist': 'Feline Medicine',
  'Bird Specialist': 'Avian Medicine',
  'Exotic Animal': 'Exotic Pet Medicine',
  'Orthopedic Vet': 'Veterinary Orthopedics',
  'Surgery': 'Veterinary Surgery',
  'Emergency Vet': 'Emergency & Critical Care',
  'Vaccination Specialist': 'Preventive Care & Vaccination',
  'Nutrition': 'Veterinary Nutrition',
  'Dental Care': 'Veterinary Dentistry'
}

export const vetSpecialities = [
  'General Veterinary Medicine',
  'Veterinary Surgery',
  'Veterinary Dermatology',
  'Veterinary Cardiology',
  'Veterinary Orthopedics',
  'Veterinary Dentistry',
  'Veterinary Ophthalmology',
  'Veterinary Neurology',
  'Veterinary Oncology',
  'Internal Medicine',
  'Emergency & Critical Care',
  'Exotic Pet Medicine'
]

const CLINIC_MAP = {
  'Dr. Meera Rao': 'MedFlow Vet Clinic - Main',
  'Dr. Arjun Sen': 'MedFlow Vet Clinic - Surgical',
  'Dr. Priya Nair': 'MedFlow Vet Clinic - Skin Care',
  'Dr. Vikram Singh': 'MedFlow Vet Clinic - Heart Care',
  'Dr. Ananya Iyer': 'MedFlow Vet Clinic - Bone & Joint',
  'Dr. Rohan Gupta': 'MedFlow Vet Clinic - Dental',
  'Dr. Kavya Menon': 'MedFlow Vet Clinic - Eye Care',
  'Dr. Aditya Kumar': 'MedFlow Vet Clinic - Neuro',
  'Dr. Sneha Patel': 'MedFlow Vet Clinic - Cancer Care',
  'Dr. Rahul Verma': 'MedFlow Vet Clinic - Internal',
  'Dr. Divya Sharma': 'MedFlow Vet Clinic - Emergency',
  'Dr. Nikhil Joshi': 'MedFlow Vet Clinic - Exotic'
}

const DEFAULT_CLINIC = 'MedFlow Veterinary Center'

export const cleanVetName = (name) => {
  if (!name) return ''
  let cleaned = String(name)
  if (cleaned.startsWith(DEMO_PREFIX)) cleaned = cleaned.slice(DEMO_PREFIX.length)
  return cleaned.trim()
}

export const cleanVetText = (text) => {
  if (!text) return ''
  let cleaned = String(text)
  for (const marker of DEMO_MARKERS) {
    cleaned = cleaned.replace(new RegExp(`\\[?${marker}\\]?\\s*-?\\s*`, 'gi'), '')
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

export const displaySpeciality = (speciality) => specialityMap[speciality] || speciality || 'Veterinary Medicine'

export const cleanVetAddress = (address) => {
  if (!address) return ''
  return [cleanVetText(address.line1), cleanVetText(address.line2)].filter(Boolean).join(', ')
}

export const vetAvatarFor = (doctor, index = 0) => {
  if (doctor?.image && !doctor.image.includes('data:image/svg+xml')) return doctor.image
  const avatars = [assets.doc1, assets.doc2, assets.doc3, assets.doc4, assets.doc5, assets.doc6, assets.doc7, assets.doc8, assets.doc9, assets.doc10, assets.doc11, assets.doc12, assets.doc13, assets.doc14, assets.doc15]
  const hash = String(doctor?._id || index).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatars[hash % avatars.length]
}

export const formatExperience = (experience) => {
  if (!experience) return ''
  const cleaned = cleanVetText(experience)
  if (!cleaned) return ''
  return /years?/i.test(cleaned) ? cleaned : `${cleaned} Years`
}

export const formatFee = (fees, currencySymbol = 'INR ') => (fees === undefined || fees === null) ? '' : `${currencySymbol}${fees}`

export const clinicNameFor = (doctor) => {
  const name = cleanVetName(doctor?.name)
  return CLINIC_MAP[name] || DEFAULT_CLINIC
}

export const normalizeDoctor = (doctor, index = 0) => {
  if (!doctor) return doctor
  const name = cleanVetName(doctor.name)
  const speciality = displaySpeciality(doctor.speciality)
  const experience = formatExperience(doctor.experience)
  return {
    ...doctor,
    name,
    speciality,
    rawSpeciality: doctor.speciality,
    experience,
    feesDisplay: formatFee(doctor.fees, 'INR '),
    clinicName: clinicNameFor({ ...doctor, name }),
    about: cleanVetText(doctor.about),
    image: vetAvatarFor({ ...doctor, image: doctor.image }, index),
    address: doctor.address
      ? {
          ...doctor.address,
          line1: cleanVetText(doctor.address.line1),
          line2: cleanVetText(doctor.address.line2)
        }
      : doctor.address
  }
}

export const normalizeDoctors = (doctors) =>
  Array.isArray(doctors) ? doctors.map((doctor, index) => normalizeDoctor(doctor, index)) : []

/**
 * Normalize a speciality string for comparison:
 * - trim whitespace
 * - lowercase
 * - decode URL-encoded characters
 * - replace multiple spaces with one space
 * - map old speciality names to current display names (case-insensitive)
 */
export const normalizeSpeciality = (value) => {
  if (!value) return ''
  let decoded = String(value).trim()
  // Decode URL-encoded characters (e.g., %20 -> space, %26 -> &)
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Malformed percent-encoding — keep the raw value
  }
  // Collapse multiple spaces into one
  const collapsed = decoded.replace(/\s+/g, ' ')
  // Try case-insensitive map lookup so old names map to new names regardless of casing
  const lower = collapsed.toLowerCase()
  const mapKey = Object.keys(specialityMap).find((key) => key.toLowerCase() === lower)
  const mapped = mapKey ? specialityMap[mapKey] : collapsed
  // Lowercase and collapse whitespace for comparison
  return mapped.toLowerCase().replace(/\s+/g, ' ')
}
