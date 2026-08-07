import appointment_img from './appointment_img.png'
import header_img from './header_img.png'
import group_profiles from './group_profiles.png'
import profile_pic from './profile_pic.png'
import contact_image from './contact_image.png'
import about_image from './about_image.png'
import logo from './logo.svg'
import dropdown_icon from './dropdown_icon.svg'
import menu_icon from './menu_icon.svg'
import cross_icon from './cross_icon.png'
import chats_icon from './chats_icon.svg'
import verified_icon from './verified_icon.svg'
import arrow_icon from './arrow_icon.svg'
import info_icon from './info_icon.svg'
import upload_icon from './upload_icon.png'
import stripe_logo from './stripe_logo.png'
import razorpay_logo from './razorpay_logo.png'
import doc1 from './doc1.png'
import doc2 from './doc2.png'
import doc3 from './doc3.png'
import doc4 from './doc4.png'
import doc5 from './doc5.png'
import doc6 from './doc6.png'
import doc7 from './doc7.png'
import doc8 from './doc8.png'
import doc9 from './doc9.png'
import doc10 from './doc10.png'
import doc11 from './doc11.png'
import doc12 from './doc12.png'
import doc13 from './doc13.png'
import doc14 from './doc14.png'
import doc15 from './doc15.png'
import veterinaryHero from './veterinary-hero.svg'
import veterinaryCare from './veterinary-care.svg'

const assetUrl = (asset) => typeof asset === 'string' ? asset : asset?.src

export const assets = {
    appointment_img: assetUrl(appointment_img),
    header_img: assetUrl(header_img),
    group_profiles: assetUrl(group_profiles),
    logo: assetUrl(logo),
    chats_icon: assetUrl(chats_icon),
    verified_icon: assetUrl(verified_icon),
    info_icon: assetUrl(info_icon),
    profile_pic: assetUrl(profile_pic),
    arrow_icon: assetUrl(arrow_icon),
    contact_image: assetUrl(contact_image),
    about_image: assetUrl(about_image),
    menu_icon: assetUrl(menu_icon),
    cross_icon: assetUrl(cross_icon),
    dropdown_icon: assetUrl(dropdown_icon),
    upload_icon: assetUrl(upload_icon),
    stripe_logo: assetUrl(stripe_logo),
    razorpay_logo: assetUrl(razorpay_logo)
    ,veterinary_hero: assetUrl(veterinaryHero)
    ,veterinary_care: assetUrl(veterinaryCare)
}

export const specialityData = [
    { speciality: 'General Veterinary Medicine', icon: '🩺' },
    { speciality: 'Veterinary Surgery', icon: '🔬' },
    { speciality: 'Veterinary Dermatology', icon: '🩹' },
    { speciality: 'Veterinary Cardiology', icon: '❤️' },
    { speciality: 'Veterinary Orthopedics', icon: '🦴' },
    { speciality: 'Veterinary Dentistry', icon: '🦷' },
    { speciality: 'Veterinary Ophthalmology', icon: '👁️' },
    { speciality: 'Veterinary Neurology', icon: '🧠' },
    { speciality: 'Veterinary Oncology', icon: '🎗️' },
    { speciality: 'Internal Medicine', icon: '🫀' },
    { speciality: 'Emergency & Critical Care', icon: '🚑' },
    { speciality: 'Exotic Pet Medicine', icon: '🦎' },
]

export const doctors = [
    {
        _id: 'doc1',
        name: 'Dr. Richard James',
        image: assetUrl(doc1),
        speciality: 'Dog Specialist',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Richard James is a dedicated veterinarian specializing in canine care, focusing on preventive medicine, early diagnosis, and effective treatment strategies for dogs of every breed.',
        fees: 50,
        address: {
            line1: '17th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc2',
        name: 'Dr. Emily Larson',
        image: assetUrl(doc2),
        speciality: 'Cat Specialist',
        degree: 'DVM',
        experience: '3 Years',
        about: 'Dr. Emily Larson is a feline-focused veterinarian committed to delivering comprehensive care for cats, from routine wellness exams to complex medical management.',
        fees: 60,
        address: {
            line1: '27th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc3',
        name: 'Dr. Sarah Patel',
        image: assetUrl(doc3),
        speciality: 'Bird Specialist',
        degree: 'DVM',
        experience: '1 Year',
        about: 'Dr. Sarah Patel specializes in avian medicine, providing expert care for pet birds including wellness exams, nutrition guidance, and treatment of common bird conditions.',
        fees: 30,
        address: {
            line1: '37th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc4',
        name: 'Dr. Christopher Lee',
        image: assetUrl(doc4),
        speciality: 'Exotic Animal',
        degree: 'DVM',
        experience: '2 Years',
        about: 'Dr. Christopher Lee provides specialized veterinary care for exotic pets including rabbits, reptiles, and small mammals, with a focus on species-appropriate medicine.',
        fees: 40,
        address: {
            line1: '47th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc5',
        name: 'Dr. Jennifer Garcia',
        image: assetUrl(doc5),
        speciality: 'Orthopedic Vet',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Jennifer Garcia is an orthopedic veterinary specialist focused on diagnosing and treating bone, joint, and mobility conditions in pets of all sizes.',
        fees: 50,
        address: {
            line1: '57th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc6',
        name: 'Dr. Andrew Williams',
        image: assetUrl(doc6),
        speciality: 'Surgery',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Andrew Williams is a veterinary surgeon with extensive experience in soft tissue and orthopedic surgical procedures, prioritizing safety and recovery.',
        fees: 50,
        address: {
            line1: '57th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc7',
        name: 'Dr. Christopher Davis',
        image: assetUrl(doc7),
        speciality: 'Emergency Vet',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Christopher Davis provides emergency veterinary care for critical conditions, delivering rapid assessment and treatment when pets need it most.',
        fees: 50,
        address: {
            line1: '17th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc8',
        name: 'Dr. Timothy White',
        image: assetUrl(doc8),
        speciality: 'Vaccination Specialist',
        degree: 'DVM',
        experience: '3 Years',
        about: 'Dr. Timothy White specializes in preventive care and vaccination programs, helping pet owners keep their companions protected against preventable diseases.',
        fees: 60,
        address: {
            line1: '27th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc9',
        name: 'Dr. Ava Mitchell',
        image: assetUrl(doc9),
        speciality: 'Nutrition',
        degree: 'DVM',
        experience: '1 Year',
        about: 'Dr. Ava Mitchell focuses on veterinary nutrition, creating tailored diet and wellness plans that support pets through every life stage.',
        fees: 30,
        address: {
            line1: '37th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc10',
        name: 'Dr. Jeffrey King',
        image: assetUrl(doc10),
        speciality: 'Dental Care',
        degree: 'DVM',
        experience: '2 Years',
        about: 'Dr. Jeffrey King specializes in veterinary dentistry, providing dental cleanings, oral surgery, and preventive care to keep pets\' smiles healthy.',
        fees: 40,
        address: {
            line1: '47th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc11',
        name: 'Dr. Zoe Kelly',
        image: assetUrl(doc11),
        speciality: 'Dog Specialist',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Zoe Kelly is a canine care specialist dedicated to comprehensive dog health, from puppy wellness to senior care and chronic condition management.',
        fees: 50,
        address: {
            line1: '57th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc12',
        name: 'Dr. Patrick Harris',
        image: assetUrl(doc12),
        speciality: 'Cat Specialist',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Patrick Harris provides expert feline medicine, understanding the unique needs of cats and creating calm, low-stress veterinary experiences.',
        fees: 50,
        address: {
            line1: '57th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc13',
        name: 'Dr. Chloe Evans',
        image: assetUrl(doc13),
        speciality: 'Exotic Animal',
        degree: 'DVM',
        experience: '4 Years',
        about: 'Dr. Chloe Evans cares for exotic pets with species-specific expertise, from reptiles and birds to small mammals and amphibians.',
        fees: 50,
        address: {
            line1: '17th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc14',
        name: 'Dr. Ryan Martinez',
        image: assetUrl(doc14),
        speciality: 'Emergency Vet',
        degree: 'DVM',
        experience: '3 Years',
        about: 'Dr. Ryan Martinez delivers urgent and emergency veterinary care, providing compassionate treatment for pets in critical situations.',
        fees: 60,
        address: {
            line1: '27th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
    {
        _id: 'doc15',
        name: 'Dr. Amelia Hill',
        image: assetUrl(doc15),
        speciality: 'Surgery',
        degree: 'DVM',
        experience: '1 Year',
        about: 'Dr. Amelia Hill is a veterinary surgeon focused on advanced surgical care, from routine procedures to complex operations, with a commitment to excellent outcomes.',
        fees: 30,
        address: {
            line1: '37th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        }
    },
]