"use client";

import { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  PawPrint,
  Calendar,
  Syringe,
  Brain,
  ChevronRight,
  Star,
  MapPin,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarCheck
} from "lucide-react";
import { AppContext } from "../../context/AppContext";
import { useProtectedPatientRoute } from "../../hooks/useProtectedPatientRoute";
import { useNavigate } from "../../lib/routerCompat";
import { cleanVetName } from "../../lib/veterinaryDisplay";

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
});

const unwrap = (responseData, key, fallback) => responseData?.data?.[key] ?? responseData?.[key] ?? fallback;
const getId = (item) => String(item?._id || item?.id || "");
const asArray = (items) => (Array.isArray(items) ? items : []);

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const todayLabel = () => {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const PetAvatar = ({ pet, size = "md" }) => {
  const name = pet?.name || "P";
  const initial = String(name).charAt(0).toUpperCase();
  const sizes = {
    sm: "h-10 w-10 text-base",
    md: "h-12 w-12 text-lg",
    lg: "h-14 w-14 text-xl"
  };
  const [imgError, setImgError] = useState(false);

  if (pet?.profileImage && !imgError) {
    return (
      <img
        src={pet.profileImage}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizes[size]} shrink-0 rounded-xl object-cover`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} grid shrink-0 place-items-center rounded-xl bg-teal/10 font-bold text-teal`}>
      {initial}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const isHealthy = normalized === "up-to-date" || normalized === "healthy" || normalized === "good";
  const isAttention = normalized === "needs attention" || normalized === "overdue" || normalized === "due" || normalized === "attention";

  if (isAttention) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        Needs Attention
      </span>
    );
  }

  if (isHealthy) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Healthy
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
      {String(status || "Unknown")}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, label, value, detail, tone }) => (
  <article className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
        <p className="mt-1.5 text-xs text-muted">{detail}</p>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { authStatus, backendUrl, token, userData } = useContext(AppContext);
  useProtectedPatientRoute({ authStatus, token });

  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const firstName = userData?.name?.split(" ")[0] || "Ravi";

  // Demo data fallback for the dashboard when API data is unavailable
  const demoPets = [
    {
      _id: "demo-buddy",
      name: "Buddy",
      species: "Dog",
      breed: "Golden Retriever",
      age: 3,
      vaccinationStatus: "up-to-date",
      nextVaccine: "2025-08-20",
      lastVisit: "2025-07-14"
    },
    {
      _id: "demo-luna",
      name: "Luna",
      species: "Cat",
      breed: "Persian",
      age: 5,
      vaccinationStatus: "overdue",
      nextVaccine: "2025-08-08",
      lastVisit: "2025-06-30"
    },
    {
      _id: "demo-max",
      name: "Max",
      species: "Dog",
      breed: "Border Collie",
      age: 2,
      vaccinationStatus: "up-to-date",
      nextVaccine: "2025-09-03",
      lastVisit: "2025-07-01"
    }
  ];

  const demoAppointments = [
    {
      _id: "demo-appt-1",
      title: "Annual Wellness Check",
      petName: "Buddy",
      vetName: "Dr. Sarah Mitchell",
      date: "2025-08-08",
      time: "10:00 AM"
    },
    {
      _id: "demo-appt-2",
      title: "FeLV Vaccination",
      petName: "Luna",
      vetName: "Dr. James Chen",
      date: "2025-08-10",
      time: "2:30 PM"
    }
  ];

  const loadDashboardData = async () => {
    if (!token) return;
    try {
      const [petsResponse, appointmentsResponse] = await Promise.allSettled([
        axios.get(`${backendUrl}/api/v1/veterinary/pets`, authConfig(token, { params: { page: 1, limit: 100 } })),
        axios.get(`${backendUrl}/api/user/appointments`, { headers: { token } })
      ]);

      if (petsResponse.status === "fulfilled") {
        const nextPets = unwrap(petsResponse.value.data, "pets", []);
        setPets(nextPets.length ? nextPets : demoPets);
      } else {
        setPets(demoPets);
      }

      if (appointmentsResponse.status === "fulfilled") {
        const nextAppointments = asArray(appointmentsResponse.value.data.appointments)
          .filter((item) => !item.cancelled && !item.isCompleted)
          .map((item) => ({
            _id: getId(item),
            title: item.docData?.speciality || "Veterinary Visit",
            petName: item.petName || "Pet",
            vetName: cleanVetName(item.docData?.name) || "Veterinarian",
            date: item.slotDate,
            time: item.slotTime
          }));
        setAppointments(nextAppointments.length ? nextAppointments : demoAppointments);
      } else {
        setAppointments(demoAppointments);
      }
    } catch {
      setPets(demoPets);
      setAppointments(demoAppointments);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, [token]);

  const healthyCount = pets.filter((pet) => {
    const status = String(pet.vaccinationStatus || "").toLowerCase();
    return status === "up-to-date" || status === "healthy" || status === "good";
  }).length;

  const attentionCount = pets.length - healthyCount;
  const vaccinesDue = pets.filter((pet) => {
    const status = String(pet.vaccinationStatus || "").toLowerCase();
    return status === "overdue" || status === "due";
  });

  const nextAppointment = appointments[0];
  const nextAppointmentLabel = nextAppointment
    ? `Next: ${formatDate(nextAppointment.date)}, ${nextAppointment.time || ""}`
    : "No upcoming appointments";

  if (authStatus === "initializing" || (!token && authStatus !== "authenticated")) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-ink">Good morning, {firstName} 👋</h2>
        <p className="mt-1 text-sm text-muted">Here's what's happening with your pets today.</p>
        <p className="mt-1 text-xs font-medium text-teal">{todayLabel()}</p>
      </div>

      {/* Health Alert */}
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-900">Vaccination Overdue</p>
            <p className="mt-1 text-sm leading-5 text-amber-800/80">
              Luna's FeLV vaccine is overdue. Please schedule an appointment soon to keep Luna protected.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/pet-owner/veterinarians")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-amber-700"
        >
          Book Now
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={PawPrint}
          label="My Pets"
          value={pets.length}
          detail={`${healthyCount} healthy · ${attentionCount} needs attention`}
          tone="bg-teal/10 text-teal"
        />
        <SummaryCard
          icon={Calendar}
          label="Upcoming Appointments"
          value={appointments.length}
          detail={nextAppointmentLabel}
          tone="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Syringe}
          label="Vaccines Due"
          value={vaccinesDue.length}
          detail={vaccinesDue.length ? `${vaccinesDue[0].name} — ${vaccinesDue[0].vaccinationStatus === "overdue" ? "overdue" : "due"}` : "All up to date"}
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={Brain}
          label="AI Health Reports"
          value="2"
          detail="Latest generated report"
          tone="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left column - My Pets */}
        <section className="rounded-2xl border border-line/70 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
            <h3 className="text-base font-bold text-ink">My Pets</h3>
            <button
              type="button"
              onClick={() => navigate("/pet-owner/pets")}
              className="flex items-center gap-1 text-sm font-semibold text-teal transition-colors hover:text-teal/80"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-line/60">
            {pets.slice(0, 3).map((pet) => (
              <div key={getId(pet)} className="flex items-center gap-4 px-6 py-4">
                <PetAvatar pet={pet} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="truncate text-sm font-bold text-ink">{pet.name}</p>
                    <StatusBadge status={pet.vaccinationStatus} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {pet.breed || pet.species || "Pet"} · {pet.species || "Unknown"} · {pet.age ? `${pet.age}y` : "Age unknown"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Syringe className="h-3 w-3 text-teal" />
                      Next vaccine: {formatDate(pet.nextVaccine || pet.nextDose)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarCheck className="h-3 w-3 text-teal" />
                      Last visit: {formatDate(pet.lastVisit)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/pet-owner/pets/${getId(pet)}`)}
                  className="hidden shrink-0 rounded-lg border border-line/70 px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-teal/30 hover:text-teal sm:block"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming */}
          <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Upcoming</h3>
              <button
                type="button"
                onClick={() => navigate("/pet-owner/appointments")}
                className="text-xs font-semibold text-teal hover:text-teal/80"
              >
                See all →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {appointments.slice(0, 2).map((appt) => (
                <div key={getId(appt)} className="rounded-xl border border-line/60 bg-mist/50 p-3.5">
                  <p className="text-sm font-bold text-ink">{appt.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {appt.petName} · {appt.vetName}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-teal">
                    {formatDate(appt.date)} · {appt.time || ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Your Veterinarian */}
          <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
            <h3 className="text-sm font-bold text-ink">Your Veterinarian</h3>
            <div className="mt-4 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal/10 text-lg font-bold text-teal">
                SM
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Dr. Sarah Mitchell</p>
                <p className="mt-0.5 text-xs text-muted">Small Animal Medicine</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-ink">4.9</span>
                  <span className="text-xs text-muted">· 284 reviews</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5 text-teal" />
              PawCare Veterinary Center
            </div>
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <Clock className="h-3.5 w-3.5" />
              Available today · Next: 3:00 PM
            </div>
            <button
              type="button"
              onClick={() => navigate("/pet-owner/veterinarians")}
              className="mt-4 w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-teal/90"
            >
              Book Appointment
            </button>
          </section>

          {/* Overall Pet Health */}
          <section className="rounded-2xl bg-gradient-to-br from-teal to-emerald-500 p-5 text-white shadow-soft-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Overall Pet Health</h3>
              <Activity className="h-5 w-5 text-white/70" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-black">81</p>
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">
                <ArrowUpRight className="h-3 w-3" />
                +3 this month
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-[81%] rounded-full bg-white" />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/85">
              2 of 3 pets fully vaccinated. Luna needs attention.
            </p>
          </section>
        </div>
      </div>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-line/70 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
          <h3 className="text-base font-bold text-ink">Recent Activity</h3>
          <button
            type="button"
            onClick={() => navigate("/pet-owner/medical-history")}
            className="text-sm font-semibold text-teal hover:text-teal/80"
          >
            Full History →
          </button>
        </div>
        <div className="divide-y divide-line/60">
          {[
            { pet: "Buddy", text: "completed Annual Wellness Check", vet: "Dr. Sarah Mitchell", date: "Jul 14, 2025" },
            { pet: "Max", text: "— Dental cleaning & 2 extractions", vet: "Dr. Sarah Mitchell", date: "Jul 1, 2025" },
            { pet: "Luna", text: "— Dermatology consultation, treatment started", vet: "Dr. James Chen", date: "Jun 30, 2025" },
            { pet: "Buddy", text: "— Rabies booster administered", vet: "Dr. Sarah Mitchell", date: "Jun 20, 2025" }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-4 px-6 py-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                {String(item.pet).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  <span className="font-bold">{item.pet}</span> {item.text}
                </p>
                <p className="mt-0.5 text-xs text-muted">{item.vet}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted">{item.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;