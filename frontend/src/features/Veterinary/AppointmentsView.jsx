"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from "lucide-react";

import { AppContext } from "../../context/AppContext";
import { isAuthSessionHandledError } from "../../api/authClient";
import { useNavigate } from "../../lib/routerCompat";
import {
  cleanVetName,
  displaySpeciality,
  clinicNameFor,
  formatFee,
  normalizeDoctor
} from "../../lib/veterinaryDisplay";
import AppointmentCard from "./AppointmentCard";

const getId = (item) => String(item?._id || item?.id || "");

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

const TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" }
];

const AppointmentDetailModal = ({ appointment, onClose, onCancel, onPay, currencySymbol }) => {
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
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusInfo.icon;
  const isScheduled = status === "scheduled";
  const isPaid = Boolean(appointment.payment);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 px-4 py-6">
      <div className="mf-card mx-auto w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              Appointment details
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">{vetName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted" />
              <span className="text-muted">Date</span>
            </div>
            <span className="text-ink">{formatSlotDate(appointment.slotDate)}</span>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted" />
              <span className="text-muted">Time</span>
            </div>
            <span className="text-ink">{appointment.slotTime || "Not set"}</span>

            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted" />
              <span className="text-muted">Speciality</span>
            </div>
            <span className="text-ink">{speciality}</span>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted" />
              <span className="text-muted">Clinic</span>
            </div>
            <span className="text-ink">{clinic}</span>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted" />
              <span className="text-muted">Fee</span>
            </div>
            <span className="text-ink">{fee || "—"}</span>

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted" />
              <span className="text-muted">Payment</span>
            </div>
            <span className="text-ink">
              {isPaid ? "Paid" : "Pending"}
            </span>

            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4 text-muted" />
              <span className="text-muted">Status</span>
            </div>
            <span className="text-ink">{statusInfo.label}</span>
          </div>

          {docData.address && (
            <div className="rounded-xl border border-line/70 bg-mist/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Clinic address
              </p>
              <p className="mt-1 text-sm text-ink">
                {docData.address.line1}
                {docData.address.line2 && `, ${docData.address.line2}`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-line/70 pt-5">
          {isScheduled && !isPaid && onPay && (
            <button
              type="button"
              onClick={onPay}
              className="mf-button"
            >
              Pay now
            </button>
          )}
          {isScheduled && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
            >
              Cancel appointment
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mf-button-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AppointmentsView = ({ appointments: rawAppointments, pets = [], onRefresh }) => {
  const { backendUrl, token, currencySymbol } = useContext(AppContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailModal, setDetailModal] = useState(null);

  // Normalize appointments: normalize docData and derive status
  const normalizedAppointments = useMemo(() => {
    return rawAppointments.map((appt) => ({
      ...appt,
      docData: normalizeDoctor(appt.docData),
      status:
        appt.status ||
        (appt.cancelled
          ? "cancelled"
          : appt.isCompleted
            ? "completed"
            : "scheduled")
    }));
  }, [rawAppointments]);

  // Count badges per tab
  const counts = useMemo(() => {
    const all = normalizedAppointments.length;
    const upcoming = normalizedAppointments.filter(
      (a) => a.status === "scheduled"
    ).length;
    const completed = normalizedAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const cancelled = normalizedAppointments.filter(
      (a) => a.status === "cancelled"
    ).length;
    return { all, upcoming, completed, cancelled };
  }, [normalizedAppointments]);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "upcoming":
        return normalizedAppointments.filter((a) => a.status === "scheduled");
      case "completed":
        return normalizedAppointments.filter((a) => a.status === "completed");
      case "cancelled":
        return normalizedAppointments.filter((a) => a.status === "cancelled");
      default:
        return normalizedAppointments;
    }
  }, [activeTab, normalizedAppointments]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter((a) => {
      const petName = (a.petName || "").toLowerCase();
      const vetName = cleanVetName(a.docData?.name || "").toLowerCase();
      const speciality = displaySpeciality(a.docData?.speciality || "").toLowerCase();
      const clinic = clinicNameFor(a.docData || "").toLowerCase();
      const date = formatSlotDate(a.slotDate).toLowerCase();
      const time = (a.slotTime || "").toLowerCase();
      return (
        petName.includes(q) ||
        vetName.includes(q) ||
        speciality.includes(q) ||
        clinic.includes(q) ||
        date.includes(q) ||
        time.includes(q)
      );
    });
  }, [searchQuery, tabFiltered]);

  const cancelAppointment = async (appointmentId) => {
    if (!token) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      );
      if (data.success) {
        toast.success(data.message);
        setDetailModal(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message);
      }
    }
  };

  const handlePay = (appointmentId) => {
    setDetailModal(null);
    navigate(`/appointment/${appointmentId}`);
  };

  const handleDetails = (appt) => {
    setDetailModal(appt);
  };

  const handleBookAppointment = () => {
    navigate("/pet-owner/appointments");
  };

  return (
    <div className="w-full min-w-0">
      {/* Page header */}
      <div className="mb-6">
        <p className="mf-eyebrow">VETERINARY APPOINTMENTS</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
          Upcoming appointments
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
          Review upcoming appointments from your existing appointment schedule.
        </p>
      </div>

      {/* Tabs + Search row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const count = counts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-teal/10 text-teal"
                    : "text-muted hover:bg-mist hover:text-ink"
                }}`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? "bg-teal text-white"
                        : "bg-slate-100 text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mf-field pl-10"
            />
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line/70 bg-white text-muted transition-colors hover:bg-mist hover:text-ink"
            aria-label="Filter"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Appointment cards */}
      <div className="space-y-4">
        {searchFiltered.length === 0 ? (
          <div className="mf-card p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-teal/5">
              <Calendar className="h-8 w-8 text-teal/40" />
            </div>
            <h3 className="text-lg font-bold text-ink">
              No appointments yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              You don't have any appointments in this category.
            </p>
            <button
              type="button"
              onClick={handleBookAppointment}
              className="mf-button mt-5"
            >
              + Book Appointment
            </button>
          </div>
        ) : (
          searchFiltered.map((appt) => (
            <AppointmentCard
              key={getId(appt)}
              appointment={appt}
              pets={pets}
              currencySymbol={currencySymbol}
              onDetails={() => handleDetails(appt)}
              onCancel={() => cancelAppointment(getId(appt))}
            />
          ))
        )}
      </div>

      {/* Details modal */}
      {detailModal && (
        <AppointmentDetailModal
          appointment={detailModal}
          currencySymbol={currencySymbol}
          onClose={() => setDetailModal(null)}
          onCancel={() => cancelAppointment(getId(detailModal))}
          onPay={() => handlePay(getId(detailModal))}
        />
      )}
    </div>
  );
};

export default AppointmentsView;
