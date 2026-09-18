"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  ChevronRight,
  PawPrint,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  cleanVetName,
  displaySpeciality,
  clinicNameFor,
  formatFee
} from "../../lib/veterinaryDisplay";
import {
  appointmentPetName,
  canPayAppointment,
  findAppointmentPet,
  formatSlotDate,
  getAppointmentDisplayStatus,
  isAppointmentPaymentPending
} from "../../lib/appointmentApi";

// Display buckets are shared with every other appointment view (see lib/appointmentApi).
const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    icon: Calendar,
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500"
  },
  past: {
    label: "Past due",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500"
  }
};

const formatTime = (value) => {
  if (!value) return "Not set";
  return String(value);
};

const SafePetImage = ({ src, alt, size = "md", className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const initial = String(alt || "P").charAt(0).toUpperCase();
  const sizeClasses = {
    sm: "h-10 w-10 text-base",
    md: "h-12 w-12 text-lg",
    lg: "h-14 w-14 text-xl"
  };
  const baseClass = `${sizeClasses[size] || sizeClasses.md} shrink-0 rounded-xl object-cover`;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className={`${baseClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${baseClass} ${className} grid place-items-center bg-teal/10 font-bold text-teal`}
    >
      <PawPrint className="h-5 w-5" />
    </div>
  );
};

const AppointmentCard = ({
  appointment,
  pets = [],
  currencySymbol = "INR ",
  onDetails,
  onCancel,
  onPay,
  paying = false
}) => {
  const docData = appointment.docData || {};
  const vetName = cleanVetName(docData.name) || "Veterinarian";
  const speciality = displaySpeciality(docData.speciality);
  const clinic = clinicNameFor(docData);
  const fee = formatFee(appointment.amount || docData.fees, currencySymbol);
  // Lifecycle bucket and payment state both come from the canonical appointment document.
  const displayStatus = getAppointmentDisplayStatus(appointment);
  const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.upcoming;
  const petName = appointmentPetName(appointment, pets);
  const slotDate = formatSlotDate(appointment.slotDate);
  const slotTime = formatTime(appointment.slotTime);

  const pet = findAppointmentPet(appointment, pets);
  const petImage = pet?.profileImage;

  const paymentPending = isAppointmentPaymentPending(appointment);
  const canPay = canPayAppointment(appointment) && typeof onPay === "function";

  return (
    <div className="group mf-card p-5 transition-shadow duration-200 hover:shadow-card-hover">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* LEFT: Pet + appointment type */}
        <div className="flex items-start gap-4">
          <SafePetImage src={petImage} alt={petName} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-ink">{petName}</p>
              <span className="text-xs font-medium text-muted">•</span>
              <span className="text-sm font-medium text-muted">{speciality}</span>
            </div>

            {/* CENTER: Date, time, vet, clinic */}
            <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted" />
                <span className="text-ink">{slotDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-muted" />
                <span className="text-ink">{slotTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 shrink-0 text-muted" />
                <span className="text-ink">{vetName}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted" />
                <span className="text-ink">{clinic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Fee, status, details */}
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-right">
            <p className="text-lg font-bold text-ink">{fee || "—"}</p>
            {paymentPending && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Payment pending
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusInfo.className}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusInfo.dot}`} />
            {statusInfo.label}
          </span>

          <div className="flex items-center gap-3">
            {canPay && (
              <button
                type="button"
                onClick={onPay}
                disabled={paying}
                title={`Pay ${fee || "the appointment fee"} online for this appointment`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {paying ? "Opening..." : "Pay online"}
              </button>
            )}
            <button
              type="button"
              onClick={onDetails}
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-colors hover:text-teal/80"
            >
              Details
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
