import axios from 'axios'

import { normalizeDoctor } from './veterinaryDisplay'

/**
 * Canonical appointment access layer.
 *
 * Every appointment view (/my-appointments and /pet-owner/appointments) reads and mutates the SAME
 * backend records through this module:
 *   - GET  /api/user/appointments        -> one canonical list (single Appointment document)
 *   - POST /api/user/cancel-appointment  -> lifecycle status on that document
 *   - POST /api/user/payment-razorpay    -> Razorpay order bound to that document id
 *   - POST /api/user/verifyRazorpay      -> verification sets `payment = true` on that document
 *
 * Nothing here creates appointments, caches payment state or invents ids: the payment status is
 * always the `payment` flag of the Appointment document returned by the backend.
 */

export const APPOINTMENTS_ENDPOINT = '/api/user/appointments'
export const RAZORPAY_ORDER_ENDPOINT = '/api/user/payment-razorpay'
export const RAZORPAY_VERIFY_ENDPOINT = '/api/user/verifyRazorpay'
export const CANCEL_APPOINTMENT_ENDPOINT = '/api/user/cancel-appointment'

const RAZORPAY_PLACEHOLDER_KEY = 'rzp_test_placeholder'

export const RAZORPAY_NOT_CONFIGURED_MESSAGE =
  'Razorpay is not configured for this website. Set NEXT_PUBLIC_RAZORPAY_KEY_ID in frontend/.env to the same Key ID the backend uses, then restart the frontend.'
export const RAZORPAY_UNAVAILABLE_MESSAGE =
  'The payment service is unavailable. Please try again.'

export const asAppointmentList = (value) => (Array.isArray(value) ? value : [])

export const getAppointmentId = (appointment) => String(appointment?._id || appointment?.id || '')

const booleanFlag = (value) => (typeof value === 'boolean' ? value : undefined)

/** Supports both the legacy `DD_MM_YYYY` slot format and the canonical `YYYY-MM-DD` format. */
export const normalizeSlotDateIso = (slotDate) => {
  const value = String(slotDate ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parts = value.split('_').map(Number)
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${String(parts[2]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`
  }

  return ''
}

export const appointmentSlotDateTime = (appointment) => {
  const isoDate = normalizeSlotDateIso(appointment?.slotDate)
  if (!isoDate) return null

  const slotTime = String(appointment?.slotTime ?? '').trim()
  const time = /^\d{2}:\d{2}$/.test(slotTime) ? slotTime : '00:00'
  const date = new Date(`${isoDate}T${time}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Lifecycle status stored on the document. Payment status is deliberately independent of this. */

/**
 * Canonical lifecycle buckets: "scheduled" | "completed" | "cancelled".
 *
 * The backend stores `status` as a lowercase enum value, but legacy documents and older writers can
 * deliver casing/alias variants ("COMPLETED", "Completed", "Canceled", ...) or lean on the
 * `cancelled` / `isCompleted` booleans alone. Normalizing here keeps every tab bucket stable no
 * matter how the value was stored. The `payment` flag is NEVER part of this resolution: payment
 * status and appointment status stay independent.
 */
const STATUS_ALIASES = {
  scheduled: 'scheduled',
  confirmed: 'scheduled',
  booked: 'scheduled',
  pending: 'scheduled',
  active: 'scheduled',
  upcoming: 'scheduled',
  completed: 'completed',
  complete: 'completed',
  finished: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled'
}

export const normalizeAppointmentStatus = (value) => {
  const key = String(value ?? '').trim().toLowerCase()
  return STATUS_ALIASES[key] || ''
}

export const getAppointmentStatus = (appointment) => {
  // The `cancelled` flag is the strongest terminal signal: every backend writer sets it together
  // with `status`, so honoring it first safely outranks any stale stored status value.
  if (appointment?.cancelled) return 'cancelled'

  const status = normalizeAppointmentStatus(appointment?.status)
  if (status) {
    // Legacy documents can carry `isCompleted: true` while `status` was never advanced past
    // "scheduled"; the completion boolean then reflects the real lifecycle state.
    if (status === 'scheduled' && appointment?.isCompleted) return 'completed'
    return status
  }

  if (appointment?.isCompleted) return 'completed'
  return 'scheduled'
}

export const isAppointmentUpcoming = (appointment, now = new Date()) => {
  const provided = booleanFlag(appointment?.isUpcoming)
  if (provided !== undefined) return provided
  if (getAppointmentStatus(appointment) !== 'scheduled') return false

  const slotDateTime = appointmentSlotDateTime(appointment)
  return Boolean(slotDateTime) && slotDateTime.getTime() > now.getTime()
}

/** The single payment-state reader: `payment === true` on the canonical Appointment document. */
export const isAppointmentPaid = (appointment) => {
  const provided = booleanFlag(appointment?.isPaid)
  if (provided !== undefined) return provided
  return appointment?.payment === true
}

export const isAppointmentPaymentPending = (appointment) => {
  const provided = booleanFlag(appointment?.isPaymentPending)
  if (provided !== undefined) return provided
  return !isAppointmentPaid(appointment) && getAppointmentStatus(appointment) !== 'cancelled'
}

/** Payment is offered for the same appointments on every view: scheduled and still unpaid. */
export const canPayAppointment = (appointment) =>
  getAppointmentStatus(appointment) === 'scheduled' && !isAppointmentPaid(appointment)

/** Cancellation mirrors the backend rule (only future, scheduled appointments can be cancelled). */
export const canCancelAppointment = (appointment) => isAppointmentUpcoming(appointment)

/**
 * Display bucket used by both views. `upcoming`/`past` are derived from the slot time while
 * `completed`/`cancelled` come from the document lifecycle status.
 */
export const getAppointmentDisplayStatus = (appointment) => {
  const status = getAppointmentStatus(appointment)
  if (status !== 'scheduled') return status
  return isAppointmentUpcoming(appointment) ? 'upcoming' : 'past'
}

export const formatSlotDate = (slotDate) => {
  if (!slotDate) return 'Not scheduled'

  const isoDate = normalizeSlotDateIso(slotDate)
  const date = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date(slotDate)
  if (Number.isNaN(date.getTime())) return String(slotDate)

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const normalizeAppointment = (appointment, index = 0) => ({
  ...appointment,
  // Canonical lifecycle status so the tab filters and status badges agree even when the stored
  // value arrives with legacy casing or only the `cancelled` / `isCompleted` booleans are set.
  status: getAppointmentStatus(appointment),
  docData: normalizeDoctor(appointment?.docData, index)
})

/** The pet the appointment was booked for, resolved from the snapshot or the owner's pet list. */
export const findAppointmentPet = (appointment, pets = []) => {
  const petId = String(appointment?.petId || '')
  if (petId) {
    const byId = asAppointmentList(pets).find((pet) => getAppointmentId(pet) === petId)
    if (byId) return byId
  }

  const petName = String(appointment?.petName || '')
  if (petName) {
    return asAppointmentList(pets).find((pet) => pet?.name === petName) || null
  }

  return null
}

export const appointmentPetName = (appointment, pets = []) =>
  appointment?.petName || findAppointmentPet(appointment, pets)?.name || 'Your Pet'

/** Single canonical read used by every appointment view. */
export const fetchPatientAppointments = async ({ backendUrl, token }) => {
  const { data } = await axios.get(`${backendUrl}${APPOINTMENTS_ENDPOINT}`, { headers: { token } })
  return asAppointmentList(data?.appointments).map((appointment, index) =>
    normalizeAppointment(appointment, index)
  )
}

export const cancelPatientAppointment = async ({ backendUrl, token, appointmentId }) => {
  const { data } = await axios.post(
    `${backendUrl}${CANCEL_APPOINTMENT_ENDPOINT}`,
    { appointmentId },
    { headers: { token } }
  )
  return data
}

/**
 * The one and only online payment workflow, shared by /my-appointments and
 * /pet-owner/appointments. It always pays the exact appointment id it is given:
 * create order for that document -> Razorpay Checkout -> verify -> backend sets `payment = true`
 * on that same document.
 *
 * Resolves with `{ status: 'paid' | 'failed' | 'cancelled', message?, appointmentId }`. Pre-checkout
 * network errors are thrown so callers keep the existing auth-session error handling.
// Prevent starting a second Razorpay Checkout from the same pending promise in-flight attempt.
// Keep this minimal: payAppointmentOnline already (re)fetches a fresh backend order every call and
// settles through a single-settle guard, so we only make the attempt idempotent on the frontend.
let activeRazorpayCheckout = null

const isReactChildren = (value) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.prototype.hasOwnProperty.call(value, '$$typeof')
 * `status: 'cancelled'` means the user dismissed the Razorpay checkout; nothing was charged and
 * the caller must clear its paying/loading state so the appointment stays payable immediately.
 */
export const payAppointmentOnline = async ({
  backendUrl,
  token,
  appointmentId,
  razorpayKeyId,
  onPaid
}) => {
  if (!appointmentId) {
    return { status: 'failed', message: 'Missing appointment reference. Refresh and try again.' }
  }

  // Razorpay Checkout must be opened with the same Key ID that created the order on the backend,
  // otherwise Razorpay rejects the payment. A placeholder means the key was never configured.
  if (!razorpayKeyId || razorpayKeyId === RAZORPAY_PLACEHOLDER_KEY) {
    return { status: 'failed', message: RAZORPAY_NOT_CONFIGURED_MESSAGE }
  }

  if (typeof window === 'undefined' || !window.Razorpay) {
    return { status: 'failed', message: RAZORPAY_UNAVAILABLE_MESSAGE }
  }

  const { data } = await axios.post(
    `${backendUrl}${RAZORPAY_ORDER_ENDPOINT}`,
    { appointmentId },
    { headers: { token } }
  )

  const order = data?.order
  if (!data?.success || !order?.id) {
    return {
      status: 'failed',
      message:
        data?.message || 'Payment could not be started: the server did not return a Razorpay order.'
    }
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const options = {
      key: razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Appointment Payment',
      description: 'Appointment Payment',
      order_id: order.id,
      receipt: order.receipt,
      // User-initiated close/cancel of the Razorpay modal. Without this the promise never
      // settles and the caller's "Opening..." state would stay stuck; resolving immediately
      // lets the caller reset loading state and allows paying again without a refresh.
      modal: {
        ondismiss: () => finish({ status: 'cancelled', appointmentId })
      },
      handler: async (response) => {
        try {
          const verified = await axios.post(
            `${backendUrl}${RAZORPAY_VERIFY_ENDPOINT}`,
            response,
            { headers: { token } }
          )

          if (!verified.data?.success) {
            finish({
              status: 'failed',
              message: verified.data?.message || 'Payment verification failed.'
            })
            return
          }

          // Refetch canonical data so the UI renders the verified `payment = true` document
          // instead of trusting local state.
          if (onPaid) {
            try {
              await onPaid(response)
            } catch (refreshError) {
              console.error('Appointment refresh after payment failed', refreshError)
            }
          }
          finish({ status: 'paid', appointmentId })
        } catch (error) {
          finish({ status: 'failed', message: error.response?.data?.message || error.message })
        }
      },
      'payment.failed': (failure) => {
        // Diagnostic only - no keys or secrets are logged. Razorpay reports the real reason here
        // (e.g. BAD_REQUEST_ERROR / invalid key / order not found).
        const detail = failure && failure.error ? failure.error : {}
        console.error('Razorpay payment.failed', {
          code: detail.code,
          description: detail.description,
          source: detail.source,
          step: detail.step,
          reason: detail.reason,
          orderId: detail.metadata && detail.metadata.order_id ? detail.metadata.order_id : undefined
        })
        finish({
          status: 'failed',
          message: detail.description || 'The payment could not be completed. No amount was charged.'
        })
      }
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  })
}
