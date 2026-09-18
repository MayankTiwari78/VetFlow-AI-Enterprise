"use client";

import { useContext, useMemo, useState } from "react";
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
import { publicEnv } from "../../lib/env";
import {
  cleanVetName,
  displaySpeciality,
  clinicNameFor,
  formatFee
} from "../../lib/veterinaryDisplay";
import {
  appointmentPetName,
  cancelPatientAppointment,
  canCancelAppointment,
  canPayAppointment,
  formatSlotDate,
  getAppointmentDisplayStatus,
  getAppointmentId,
  isAppointmentPaid,
  normalizeAppointment,
  payAppointmentOnline
} from "../../lib/appointmentApi";
import AppointmentCard from "./AppointmentCard";

// Display buckets shared with /my-appointments (see lib/appointmentApi): a scheduled appointment is
// only "Upcoming" while its slot is in the future, otherwise it is "Past due".
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

const TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" }
];

const AppointmentDetailModal = ({ appointment, pets = [], onClose, onCancel, onPay, paying = false, currencySymbol }) => {
  const docData = appointment.docData || {};
  const vetName = cleanVetName(docData.name) || "Veterinarian";
  const speciality = displaySpeciality(docData.speciality);
  const clinic = clinicNameFor(docData);
  const fee = formatFee(appointment.amount || docData.fees, currencySymbol);
  const petName = appointmentPetName(appointment, pets);
  const displayStatus = getAppointmentDisplayStatus(appointment);
  const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.upcoming;
  const StatusIcon = statusInfo.icon;
  const isPaid = isAppointmentPaid(appointment);
  const canPay = canPayAppointment(appointment) && Boolean(onPay);
  const canCancel = canCancelAppointment(appointment) && Boolean(onCancel);

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
              <span className="text-muted">Pet</span>
            </div>
            <span className="text-ink">{petName}</span>

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
          {canPay && (
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="mf-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? "Opening Razorpay..." : "Pay online"}
            </button>
          )}
          {canCancel && (
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
  const [payingId, setPayingId] = useState("");

  // Every appointment below is the canonical Appointment document returned by
  // GET /api/user/appointments (the same records shown by /my-appointments).
  const normalizedAppointments = useMemo(
    () => rawAppointments.map((appt, index) => normalizeAppointment(appt, index)),
    [rawAppointments]
  );

  // Count badges per tab, using the shared display buckets for both views.
  const counts = useMemo(() => {
    const all = normalizedAppointments.length;
    const upcoming = normalizedAppointments.filter(
      (a) => getAppointmentDisplayStatus(a) === "upcoming"
    ).length;
    const past = normalizedAppointments.filter(
      (a) => getAppointmentDisplayStatus(a) === "past"
    ).length;
    const completed = normalizedAppointments.filter(
      (a) => getAppointmentDisplayStatus(a) === "completed"
    ).length;
    const cancelled = normalizedAppointments.filter(
      (a) => getAppointmentDisplayStatus(a) === "cancelled"
    ).length;
    return { all, upcoming, past, completed, cancelled };
  }, [normalizedAppointments]);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return normalizedAppointments;
    return normalizedAppointments.filter(
      (a) => getAppointmentDisplayStatus(a) === activeTab
    );
  }, [activeTab, normalizedAppointments]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter((a) => {
      const petName = appointmentPetName(a, pets).toLowerCase();
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
  }, [searchQuery, tabFiltered, pets]);

  const cancelAppointment = async (appointmentId) => {
    if (!token || !appointmentId) return;
    try {
      const data = await cancelPatientAppointment({ backendUrl, token, appointmentId });
      if (data?.success) {
        toast.success(data.message);
        setDetailModal(null);
        if (onRefresh) await onRefresh();
      } else {
        toast.error(data?.message);
      }
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message);
      }
    }
  };

  /**
   * Pays the exact appointment shown in this view through the single shared Razorpay workflow:
   * POST /api/user/payment-razorpay -> Razorpay Checkout -> POST /api/user/verifyRazorpay.
   * No navigation and no locally invented appointment id.
   */
  const handlePay = async (appointmentId) => {
    if (!token || !appointmentId || payingId) return;

    setPayingId(appointmentId);
    try {
      const result = await payAppointmentOnline({
        backendUrl,
        token,
        appointmentId,
        razorpayKeyId: publicEnv.razorpayKeyId,
        // Refetch the canonical list so the UI reflects the verified `payment = true` document.
        onPaid: () => (onRefresh ? onRefresh() : undefined)
      });

      if (result.status === "paid") {
        setDetailModal(null);
        toast.success("Payment successful");
      } else if (result.status === "cancelled") {
        // User closed Razorpay - nothing charged, no error toast. The finally block below has
        // already cleared payingId, so the button is "Pay online" again and can be re-clicked.
      } else if (result.message) {
        toast.error(result.message);
      }
    } catch (error) {
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message);
      }
    } finally {
      setPayingId("");
    }
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
              You don&apos;t have any appointments in this category.
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
              key={getAppointmentId(appt)}
              appointment={appt}
              pets={pets}
              currencySymbol={currencySymbol}
              onPay={() => handlePay(getAppointmentId(appt))}
              paying={payingId === getAppointmentId(appt)}
              onDetails={() => handleDetails(appt)}
              onCancel={() => cancelAppointment(getAppointmentId(appt))}
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
          onCancel={() => cancelAppointment(getAppointmentId(detailModal))}
          onPay={() => handlePay(getAppointmentId(detailModal))}
        />
      )}
    </div>
  );
};

export default AppointmentsView;
