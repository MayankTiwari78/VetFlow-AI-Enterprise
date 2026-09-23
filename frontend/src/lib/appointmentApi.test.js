import { describe, expect, it, vi } from 'vitest'

// veterinaryDisplay (imported by appointmentApi) pulls in the image assets module; mock it so the
// test runs in a plain node environment without loading binary assets.
vi.mock('../assets/assets', () => ({ assets: {} }))

const {
  getAppointmentStatus,
  getAppointmentDisplayStatus,
  normalizeAppointmentStatus,
  normalizeAppointment,
  isAppointmentPaid
} = await import('./appointmentApi')

const isoDate = (offsetDays) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

const baseAppointment = (overrides = {}) => ({
  _id: 'appt-1',
  slotDate: isoDate(7),
  slotTime: '10:00',
  cancelled: false,
  isCompleted: false,
  payment: false,
  status: 'scheduled',
  ...overrides
})

describe('normalizeAppointmentStatus - backend value harmonization', () => {
  it('accepts every common casing of the completed value', () => {
    expect(normalizeAppointmentStatus('completed')).toBe('completed')
    expect(normalizeAppointmentStatus('COMPLETED')).toBe('completed')
    expect(normalizeAppointmentStatus('Completed')).toBe('completed')
    expect(normalizeAppointmentStatus('  COMPLETED  ')).toBe('completed')
  })

  it('accepts casing and spelling variants of the cancelled value', () => {
    expect(normalizeAppointmentStatus('cancelled')).toBe('cancelled')
    expect(normalizeAppointmentStatus('CANCELLED')).toBe('cancelled')
    expect(normalizeAppointmentStatus('Canceled')).toBe('cancelled')
  })

  it('maps scheduling aliases to scheduled', () => {
    expect(normalizeAppointmentStatus('Scheduled')).toBe('scheduled')
    expect(normalizeAppointmentStatus('CONFIRMED')).toBe('scheduled')
    expect(normalizeAppointmentStatus('booked')).toBe('scheduled')
  })

  it('returns an empty string for unknown or missing values', () => {
    expect(normalizeAppointmentStatus('checked-in')).toBe('')
    expect(normalizeAppointmentStatus('')).toBe('')
    expect(normalizeAppointmentStatus(null)).toBe('')
    expect(normalizeAppointmentStatus(undefined)).toBe('')
  })
})

describe('getAppointmentStatus - appointment lifecycle resolution', () => {
  it('keeps the canonical lowercase backend value for a completed appointment', () => {
    expect(getAppointmentStatus(baseAppointment({ status: 'completed', isCompleted: true }))).toBe('completed')
  })

  it('treats "COMPLETED"/"Completed" status variants as completed', () => {
    expect(getAppointmentStatus(baseAppointment({ status: 'COMPLETED', isCompleted: true, payment: true }))).toBe('completed')
    expect(getAppointmentStatus(baseAppointment({ status: 'Completed', isCompleted: true, payment: true }))).toBe('completed')
  })

  it('falls back to the isCompleted flag when status is missing', () => {
    const appointment = baseAppointment({ status: undefined, isCompleted: true, payment: true })
    delete appointment.status
    expect(getAppointmentStatus(appointment)).toBe('completed')
  })

  it('treats a stale "scheduled" status with isCompleted true as completed', () => {
    expect(getAppointmentStatus(baseAppointment({ status: 'scheduled', isCompleted: true, payment: true }))).toBe('completed')
  })

  it('never derives completion from the payment flag', () => {
    const paidUnfinished = baseAppointment({ payment: true })
    expect(getAppointmentStatus(paidUnfinished)).toBe('scheduled')
    expect(getAppointmentStatus(baseAppointment({ payment: true, status: undefined }))).not.toBe('completed')
  })

  it('treats the cancelled boolean as the strongest terminal signal', () => {
    expect(getAppointmentStatus(baseAppointment({ status: 'scheduled', cancelled: true, isCompleted: false }))).toBe('cancelled')
    expect(getAppointmentStatus(baseAppointment({ status: undefined, cancelled: true }))).toBe('cancelled')
  })

  it('keeps a stored cancelled status even when isCompleted was left true', () => {
    expect(getAppointmentStatus(baseAppointment({ status: 'cancelled', cancelled: true, isCompleted: true }))).toBe('cancelled')
  })

  it('defaults to scheduled when no lifecycle signal exists', () => {
    const appointment = baseAppointment()
    delete appointment.status
    expect(getAppointmentStatus(appointment)).toBe('scheduled')
  })
})

describe('getAppointmentDisplayStatus - pet owner appointment tab buckets', () => {
  it('buckets a completed (and paid) appointment into the Completed tab', () => {
    const appointment = baseAppointment({
      status: 'completed',
      isCompleted: true,
      payment: true,
      isPaid: true,
      isUpcoming: false,
      isPast: false,
      slotDate: isoDate(-10)
    })
    expect(getAppointmentDisplayStatus(appointment)).toBe('completed')
  })

  it('buckets casing-variant completed statuses into the Completed tab', () => {
    const appointment = baseAppointment({ status: 'COMPLETED', isCompleted: true, slotDate: isoDate(-10) })
    expect(getAppointmentDisplayStatus(appointment)).toBe('completed')
  })

  it('buckets a cancelled appointment into the Cancelled tab', () => {
    const appointment = baseAppointment({ status: 'cancelled', cancelled: true, isCompleted: false })
    expect(getAppointmentDisplayStatus(appointment)).toBe('cancelled')
  })

  it('derives upcoming and past buckets for scheduled appointments from the slot time', () => {
    expect(getAppointmentDisplayStatus(baseAppointment({ slotDate: isoDate(7) }))).toBe('upcoming')
    expect(getAppointmentDisplayStatus(baseAppointment({ slotDate: isoDate(-7) }))).toBe('past')
  })

  it('never places a paid but unfinished appointment in the Completed tab', () => {
    const appointment = baseAppointment({ payment: true, slotDate: isoDate(-7) })
    expect(getAppointmentDisplayStatus(appointment)).toBe('past')
    expect(isAppointmentPaid(appointment)).toBe(true)
  })
})

describe('normalizeAppointment - canonical document normalization', () => {
  it('stamps the canonical status so tab filters and badges agree', () => {
    const normalized = normalizeAppointment(baseAppointment({ status: 'COMPLETED', isCompleted: true }))
    expect(normalized.status).toBe('completed')
    expect(getAppointmentDisplayStatus(normalized)).toBe('completed')
  })

  it('preserves the rest of the appointment document and normalizes docData', () => {
    const appointment = baseAppointment({ payment: true, docData: { name: 'Dr. Meera Rao' } })
    const normalized = normalizeAppointment(appointment, 0)
    expect(normalized._id).toBe('appt-1')
    expect(normalized.payment).toBe(true)
    expect(normalized.docData).toBeDefined()
  })
})

