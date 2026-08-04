import axios from 'axios'
import React, { useState } from 'react'
import { useContext, useEffect } from 'react'
import { toast } from 'react-toastify'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import { isAuthSessionHandledError } from '../../api/authClient'

const emptyRecordDraft = {
  type: 'consultation_summary',
  title: '',
  summary: '',
  patientVisible: true,
  status: 'draft',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
  vaccineName: '',
  administeredOn: '',
  nextDueOn: ''
}

const DoctorAppointments = () => {

  const { dToken, backendUrl, appointments, getAppointments, cancelAppointment, completeAppointment, updateClinicalNotes } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [recordDrafts, setRecordDrafts] = useState({})

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken])

  const updateRecordDraft = (appointmentId, patch) => {
    setRecordDrafts((current) => ({
      ...current,
      [appointmentId]: { ...emptyRecordDraft, ...(current[appointmentId] || {}), ...patch }
    }))
  }

  const saveMedicalRecord = async (appointmentId) => {
    const draft = { ...emptyRecordDraft, ...(recordDrafts[appointmentId] || {}) }
    const details = {}
    if (draft.type === 'prescription_plan' && draft.medicineName) {
      details.medicines = [{ name: draft.medicineName, dosage: draft.dosage, frequency: draft.frequency, duration: draft.duration, instructions: draft.instructions }]
    }
    if (draft.type === 'vaccination_record' && draft.vaccineName) {
      details.vaccine = { name: draft.vaccineName, administeredOn: draft.administeredOn, nextDueOn: draft.nextDueOn || undefined }
    }
    try {
      const { data } = await axios.post(`${backendUrl}/api/doctor/appointments/${appointmentId}/medical-records`, {
        type: draft.type,
        title: draft.title,
        summary: draft.summary,
        details,
        patientVisible: draft.patientVisible,
        status: draft.status
      }, { headers: { dToken } })
      toast.success(data.message || 'Medical record saved')
      setRecordDrafts((current) => ({ ...current, [appointmentId]: emptyRecordDraft }))
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || 'Unable to save medical record')
    }
  }

  return (
    <main className='portal-page'>

      <div><p className='portal-eyebrow'>Clinical schedule</p><h1 className='portal-title'>Appointments</h1><p className='mt-2 text-slate-600'>Review patient bookings and record appointment outcomes.</p></div>

      <div className='portal-card text-sm max-h-[75vh] overflow-y-auto'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b border-line bg-mist font-semibold text-slate-600'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <div className='border-b border-line hover:bg-mist' key={item._id || index}>
            <div className='flex flex-wrap justify-between max-sm:gap-5 sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-slate-600 py-3 px-6'>
              <p className='max-sm:hidden'>{index}</p>
              <div className='flex items-center gap-2'>
                <img src={item.userData.image} className='w-8 rounded-full bg-mist' alt={item.userData.name} /> <p>{item.userData.name}</p>
              </div>
              <div>
                <p className='portal-status bg-[#E7F4F5] text-primary'>
                  {item.payment?'Online':'CASH'}
                </p>
              </div>
              <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
              <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
              <p>{currency}{item.amount}</p>
              {item.cancelled
                ? <p className='portal-status bg-red-50 text-red-700'>Cancelled</p>
                : item.isCompleted
                  ? <p className='portal-status bg-emerald-50 text-emerald-700'>Completed</p>
                  : <div className='flex'>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                    <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="" />
                  </div>
              }
            </div>
            <div className='grid gap-3 px-6 pb-4 sm:grid-cols-[1fr_auto] sm:items-end'>
              <label className='portal-label'>Clinical notes<textarea className='portal-field mt-1 min-h-20 resize-y' value={noteDrafts[item._id] ?? item.clinicalNotes ?? ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [item._id]: event.target.value }))} maxLength={5000} /></label>
              <button type='button' className='portal-button-secondary' onClick={() => updateClinicalNotes(item._id, noteDrafts[item._id] ?? item.clinicalNotes ?? '')}>Save notes</button>
            </div>
            {item.isCompleted && <div className='border-t border-line px-6 py-4'>
              <p className='portal-eyebrow'>Patient-visible medical record</p>
              <p className='mt-1 text-xs text-slate-500'>Private clinical notes stay separate. Save a finalized record only when it should appear in the patient timeline.</p>
              <div className='mt-4 grid gap-3 lg:grid-cols-4'>
                <select className='portal-field' value={(recordDrafts[item._id] || emptyRecordDraft).type} onChange={(event) => updateRecordDraft(item._id, { type: event.target.value })}>
                  <option value='consultation_summary'>Consultation summary</option>
                  <option value='diagnosis_history'>Diagnosis/history</option>
                  <option value='treatment_plan'>Treatment plan</option>
                  <option value='prescription_plan'>Prescription plan</option>
                  <option value='vaccination_record'>Vaccination</option>
                  <option value='report_metadata'>Report metadata</option>
                </select>
                <input className='portal-field lg:col-span-2' placeholder='Record title' value={(recordDrafts[item._id] || emptyRecordDraft).title} onChange={(event) => updateRecordDraft(item._id, { title: event.target.value })} />
                <select className='portal-field' value={(recordDrafts[item._id] || emptyRecordDraft).status} onChange={(event) => updateRecordDraft(item._id, { status: event.target.value })}>
                  <option value='draft'>Draft</option>
                  <option value='finalized'>Finalized</option>
                </select>
                <textarea className='portal-field min-h-24 resize-y lg:col-span-4' placeholder='Patient-visible summary' value={(recordDrafts[item._id] || emptyRecordDraft).summary} onChange={(event) => updateRecordDraft(item._id, { summary: event.target.value })} />
                {(recordDrafts[item._id] || emptyRecordDraft).type === 'prescription_plan' && <div className='grid gap-3 lg:col-span-4 lg:grid-cols-5'><input className='portal-field' placeholder='Medicine' value={(recordDrafts[item._id] || emptyRecordDraft).medicineName} onChange={(event) => updateRecordDraft(item._id, { medicineName: event.target.value })} /><input className='portal-field' placeholder='Dosage' value={(recordDrafts[item._id] || emptyRecordDraft).dosage} onChange={(event) => updateRecordDraft(item._id, { dosage: event.target.value })} /><input className='portal-field' placeholder='Frequency' value={(recordDrafts[item._id] || emptyRecordDraft).frequency} onChange={(event) => updateRecordDraft(item._id, { frequency: event.target.value })} /><input className='portal-field' placeholder='Duration' value={(recordDrafts[item._id] || emptyRecordDraft).duration} onChange={(event) => updateRecordDraft(item._id, { duration: event.target.value })} /><input className='portal-field' placeholder='Instructions' value={(recordDrafts[item._id] || emptyRecordDraft).instructions} onChange={(event) => updateRecordDraft(item._id, { instructions: event.target.value })} /></div>}
                {(recordDrafts[item._id] || emptyRecordDraft).type === 'vaccination_record' && <div className='grid gap-3 lg:col-span-4 lg:grid-cols-3'><input className='portal-field' placeholder='Vaccine name' value={(recordDrafts[item._id] || emptyRecordDraft).vaccineName} onChange={(event) => updateRecordDraft(item._id, { vaccineName: event.target.value })} /><input className='portal-field' type='date' value={(recordDrafts[item._id] || emptyRecordDraft).administeredOn} onChange={(event) => updateRecordDraft(item._id, { administeredOn: event.target.value })} /><input className='portal-field' type='date' value={(recordDrafts[item._id] || emptyRecordDraft).nextDueOn} onChange={(event) => updateRecordDraft(item._id, { nextDueOn: event.target.value })} /></div>}
              </div>
              <div className='mt-4 flex flex-wrap items-center gap-3'><label className='flex items-center gap-2 text-xs font-semibold text-slate-600'><input type='checkbox' checked={(recordDrafts[item._id] || emptyRecordDraft).patientVisible} onChange={(event) => updateRecordDraft(item._id, { patientVisible: event.target.checked })} /> Patient-visible after finalization</label><button type='button' className='portal-button' onClick={() => saveMedicalRecord(item._id)}>Save medical record</button></div>
            </div>}
          </div>
        ))}
      </div>

        {appointments.length === 0 && <p className='p-10 text-center text-slate-500'>No appointments are currently assigned.</p>}
    </main>
  )
}

export default DoctorAppointments
