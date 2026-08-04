export interface Address {
  line1: string;
  line2: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  expiryDate: string;
}

export interface PatientHealthProfile {
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medicalNotes: string;
  emergencyContact: EmergencyContact;
  insurance: InsuranceDetails;
  updatedAt?: Date;
}

export interface DoctorAvailabilityDay {
  dayOfWeek: number;
  slots: string[];
}

export interface DoctorAvailability {
  enabled: boolean;
  timezone: string;
  consultationDurationMinutes: number;
  weeklySchedule: DoctorAvailabilityDay[];
}

export interface UserProfileSnapshot {
  _id?: unknown;
  name: string;
  email: string;
  image: string;
  phone: string;
  address: Address;
  gender: string;
  dob: string;
}

export interface DoctorSnapshot {
  _id?: unknown;
  name: string;
  email?: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  available: boolean;
  fees: number;
  address: Address;
  date: number;
  slots_booked?: Record<string, string[]>;
}
