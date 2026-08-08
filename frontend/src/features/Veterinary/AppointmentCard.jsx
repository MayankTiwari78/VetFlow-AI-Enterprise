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

const STATUS_CONFIG = {
  scheduled: {
    label: "Upcoming",
    icon: Calendar,
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500"
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

const formatSlotDate = (value) => {
  if (!value) return "Not scheduled";
  if (typeof value === "string" && value.includes("_")) {
    const parts = value.split("_").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      }
    }
    return String(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
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
  onPay
}) => {
  const docData = appointment.docData || {};
  const vetName = cleanVetName(docData.name) || "Veterinarian";
  const speciality = displaySpeciality(docData.speciality);
  const clinic = clinicNameFor(docData);
  const fee = formatFee(appointment.amount || docData.fees, currencySymbol);
  const status =
    appointment.status ||
    (appointment.cancelled
      ? "cancelled"
      : appointment.isCompleted
        ? "completed"
        : "scheduled");
  const petName = appointment.petName || "Your Pet";
  const slotDate = formatSlotDate(appointment.slotDate);
  const slotTime = formatTime(appointment.slotTime);
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusInfo.icon;

  const pet = pets.find((p) => p.name === petName);
  const petImage = pet?.profileImage;

  const isScheduled = status === "scheduled";
  const isPaid = Boolean(appointment.payment);

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
            {!isPaid && isScheduled && (
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
  );
};

export default AppointmentCard;
