"use client";

import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  ExternalLink,
  Filter,
  PawPrint,
  Plus,
  Search,
  Syringe,
  Trash2,
  X
} from "lucide-react";

import { AppContext } from "../../context/AppContext";
import { useProtectedPatientRoute } from "../../hooks/useProtectedPatientRoute";
import { useNavigate } from "../../lib/routerCompat";
import { isAuthSessionHandledError } from "../../api/authClient";

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
});

const unwrap = (responseData, key, fallback) =>
  responseData?.data?.[key] ?? responseData?.[key] ?? fallback;

const asArray = (items) => (Array.isArray(items) ? items : []);

const getId = (item) => String(item?._id || item?.id || "");

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const shortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const daysFromNow = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
};

const daysAgo = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
};

const STATUS_TONES = {
  "up-to-date": "bg-emerald-100 text-emerald-700",
  "due-soon": "bg-amber-100 text-amber-800",
  overdue: "bg-rose-100 text-rose-800",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-600"
};

const STATUS_LABELS = {
  "up-to-date": "Up to Date",
  "due-soon": "Due Soon",
  overdue: "Overdue",
  completed: "Completed",
  cancelled: "Cancelled"
};

const computeStatus = (vaccination) => {
  if (vaccination.status && vaccination.status !== "up-to-date") {
    return vaccination.status;
  }

  const now = new Date();
  const due = vaccination.dueDate ? new Date(vaccination.dueDate) : null;
  const completed = vaccination.completedDate ? new Date(vaccination.completedDate) : null;
  const next = vaccination.nextDose ? new Date(vaccination.nextDose) : null;

  if (completed && due && completed >= due) return "completed";
  if (next) {
    const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "overdue";
    if (diff <= 7) return "due-soon";
    return "up-to-date";
  }
  if (due) {
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "overdue";
    if (diff <= 7) return "due-soon";
    return "up-to-date";
  }
  return "up-to-date";
};

const getVeterinarianName = (vaccination) => {
  if (!vaccination) return "—";
  if (vaccination.veterinarianName) return vaccination.veterinarianName;
  const vet = vaccination.veterinarian;
  if (!vet) return vaccination.veterinarian || "—";
  if (typeof vet === "string") return vet;
  if (vet.doctorId) {
    if (typeof vet.doctorId === "string") return vet.doctorId;
    return vet.doctorId.name || vet.clinicName || "—";
  }
  return vet.name || vet.clinicName || "—";
};

const getClinicName = (vaccination) => {
  if (!vaccination) return "—";
  if (vaccination.clinic) return vaccination.clinic;
  const vet = vaccination.veterinarian;
  if (vet && typeof vet === "object" && vet.clinicName) return vet.clinicName;
  return "—";
};

const getPetName = (vaccination, pets) => {
  if (!vaccination) return "—";
  if (vaccination.petName) return vaccination.petName;
  const pet = vaccination.petId;
  if (!pet) return "—";
  if (typeof pet === "string") {
    const found = (pets || []).find((p) => getId(p) === pet);
    return found ? found.name : "—";
  }
  return pet.name || "—";
};

const getPetSpecies = (vaccination, pets) => {
  if (!vaccination) return "";
  if (vaccination.petSpecies) return vaccination.petSpecies;
  const pet = vaccination.petId;
  if (!pet) return "";
  if (typeof pet === "string") {
    const found = (pets || []).find((p) => getId(p) === pet);
    return found ? found.species : "";
  }
  return pet.species || "";
};

const SPECIES_CATEGORIES = {
  Dog: ["Core", "DHPP", "Rabies", "Bordetella", "Leptospirosis", "Heartworm", "Parasite Prevention", "Non-Core", "Canine", "Other"],
  Cat: ["Core", "FVRCP", "Rabies", "FeLV", "Non-Core", "Feline", "Other"],
  default: ["Core", "Non-Core", "Rabies", "Other"]
};

const getCategoriesForSpecies = (species) => {
  if (!species) return SPECIES_CATEGORIES.default;
  const key = species.toLowerCase();
  if (key.includes("dog") || key.includes("canine")) return SPECIES_CATEGORIES.Dog;
  if (key.includes("cat") || key.includes("feline")) return SPECIES_CATEGORIES.Cat;
  return SPECIES_CATEGORIES.default;
};

const StatusBadge = ({ vaccination }) => {
  const status = computeStatus(vaccination);
  const tone = STATUS_TONES[status] || STATUS_TONES["up-to-date"];
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {label}
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

const DetailItem = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 text-sm font-medium text-ink">{value}</p>
  </div>
);

const VaccinationForm = ({ pet, initialData, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    vaccineName: initialData?.vaccineName || "",
    category: initialData?.category || "Core",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : "",
    completedDate: initialData?.completedDate
      ? new Date(initialData.completedDate).toISOString().slice(0, 10)
      : "",
    nextDose: initialData?.nextDose
      ? new Date(initialData.nextDose).toISOString().slice(0, 10)
      : "",
    dose: initialData?.dose || "",
    route: initialData?.route || "",
    veterinarian: initialData?.veterinarian || "",
    clinic: initialData?.clinic || "",
    manufacturer: initialData?.manufacturer || "",
    batchNumber: initialData?.batchNumber || "",
    certificate: initialData?.certificate || "",
    notes: initialData?.notes || "",
    status: initialData?.status || "up-to-date"
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(form);
  };

  const species = pet?.species || "";
  const categories = getCategoriesForSpecies(species);
  const routes = ["Subcutaneous", "Intramuscular", "Intradermal", "Oral", "Intranasal"];
  const statuses = ["up-to-date", "due-soon", "overdue", "completed", "cancelled"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-soft-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">
            {initialData ? "Edit Vaccination" : "Add Vaccination"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Vaccine name *
              </label>
              <input
                type="text"
                required
                value={form.vaccineName}
                onChange={(e) => handleChange("vaccineName", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="e.g. DHPP, Rabies, FeLV"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Due date *
              </label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => handleChange("dueDate", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Completed date
              </label>
              <input
                type="date"
                value={form.completedDate}
                onChange={(e) => handleChange("completedDate", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Next dose
              </label>
              <input
                type="date"
                value={form.nextDose}
                onChange={(e) => handleChange("nextDose", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Dose
              </label>
              <input
                type="text"
                value={form.dose}
                onChange={(e) => handleChange("dose", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="e.g. 1st, 2nd, Booster"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Route
              </label>
              <select
                value={form.route}
                onChange={(e) => handleChange("route", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
              >
                <option value="">Select route</option>
                {routes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Clinic
              </label>
              <input
                type="text"
                value={form.clinic}
                onChange={(e) => handleChange("clinic", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="Veterinary clinic name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Manufacturer
              </label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => handleChange("manufacturer", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="e.g. Zoetis, Merck"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Batch number
              </label>
              <input
                type="text"
                value={form.batchNumber}
                onChange={(e) => handleChange("batchNumber", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="Vaccine batch number"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Certificate URL
              </label>
              <input
                type="url"
                value={form.certificate}
                onChange={(e) => handleChange("certificate", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-line/70 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line/80 bg-white px-5 py-2.5 text-sm font-bold text-ink transition-all hover:border-teal/40 hover:bg-mist hover:text-teal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-teal/90 disabled:opacity-60"
            >
              {loading ? "Saving..." : initialData ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VaccinationDetailsModal = ({ vaccination, pets, onClose }) => {
  if (!vaccination) return null;
  const status = computeStatus(vaccination);
  const tone = STATUS_TONES[status] || STATUS_TONES["up-to-date"];
  const label = STATUS_LABELS[status] || status;
  const petName = getPetName(vaccination, pets);
  const species = getPetSpecies(vaccination, pets);
  const vetName = getVeterinarianName(vaccination);
  const clinic = getClinicName(vaccination);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-soft-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">{vaccination.vaccineName}</h2>
            {petName && petName !== "—" && (
              <p className="mt-1 text-sm text-muted">
                {petName}
                {species ? ` · ${species}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
            {label}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Category" value={vaccination.category || "—"} />
          <DetailItem label="Dose" value={vaccination.dose || "—"} />
          <DetailItem label="Route" value={vaccination.route || "—"} />
          <DetailItem label="Due date" value={formatDate(vaccination.dueDate)} />
          <DetailItem label="Completed date" value={formatDate(vaccination.completedDate)} />
          <DetailItem label="Next dose" value={formatDate(vaccination.nextDose)} />
          <DetailItem label="Clinic" value={clinic} />
          <DetailItem label="Veterinarian" value={vetName} />
          <DetailItem label="Manufacturer" value={vaccination.manufacturer || "—"} />
          <DetailItem label="Batch number" value={vaccination.batchNumber || "—"} />
        </div>

        {vaccination.certificate && (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Certificate
            </label>
            <a
              href={vaccination.certificate}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal break-all hover:text-teal/80"
            >
              <ExternalLink className="h-4 w-4" />
              View Certificate
            </a>
          </div>
        )}

        {vaccination.notes && (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Notes
            </label>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{vaccination.notes}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line/80 bg-white px-5 py-2.5 text-sm font-bold text-ink transition-all hover:border-teal/40 hover:bg-mist hover:text-teal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const VaccinationDashboard = () => {
  const navigate = useNavigate();
  const { authStatus, backendUrl, token } = useContext(AppContext);
  useProtectedPatientRoute({ authStatus, token });

  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("dueDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [modalMode, setModalMode] = useState(null);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [detailsVaccination, setDetailsVaccination] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPets = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/veterinary/pets`, authConfig(token, {
        params: { page: 1, limit: 100 }
      }));
      const nextPets = unwrap(data, "pets", []);
      setPets(nextPets);
      if (nextPets.length > 0) {
        const current = nextPets.find((p) => getId(p) === selectedPetId);
        if (!current) {
          setSelectedPetId(getId(nextPets[0]));
        }
      }
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || "Failed to load pets.");
      }
    }
  };

  const loadVaccinations = async () => {
    if (!token || !selectedPetId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/pets/${selectedPetId}/vaccinations`,
        authConfig(token, {
          params: {
            page,
            limit: 20,
            search,
            sort: `${sortDirection === "desc" ? "-" : ""}${sortField}`
          }
        })
      );
      const items = unwrap(data, "vaccinations", []);
      setVaccinations(items);
      setPagination(data.pagination || { page, limit: 20, total: items.length, pages: 1 });
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || "Failed to load vaccinations.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token || !selectedPetId) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/pets/${selectedPetId}/vaccinations/stats`,
        authConfig(token)
      );
      setStats(data.stats || data);
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        // Non-fatal — stats are supplementary
      }
    }
  };

  const loadUpcoming = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/vaccinations/upcoming`,
        authConfig(token, { params: { page: 1, limit: 10 } })
      );
      setUpcoming(unwrap(data, "vaccinations", []));
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        // Non-fatal
      }
    }
  };

  const loadOverdue = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/veterinary/vaccinations/overdue`,
        authConfig(token, { params: { page: 1, limit: 10 } })
      );
      setOverdue(unwrap(data, "vaccinations", []));
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        // Non-fatal
      }
    }
  };

  useEffect(() => {
    void loadPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadVaccinations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedPetId, page, search, sortField, sortDirection]);

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedPetId]);

  useEffect(() => {
    void loadUpcoming();
    void loadOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredVaccinations = useMemo(() => {
    return vaccinations.filter((v) => {
      const status = computeStatus(v);
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        return (
          (v.vaccineName || "").toLowerCase().includes(term) ||
          (v.notes || "").toLowerCase().includes(term) ||
          (v.manufacturer || "").toLowerCase().includes(term) ||
          (v.batchNumber || "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [vaccinations, categoryFilter, statusFilter, search]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        completedDate: form.completedDate ? new Date(form.completedDate) : undefined,
        nextDose: form.nextDose ? new Date(form.nextDose) : undefined
      };

      if (editingVaccination) {
        await axios.patch(
          `${backendUrl}/api/v1/veterinary/vaccinations/${getId(editingVaccination)}`,
          payload,
          authConfig(token)
        );
      } else {
        await axios.post(
          `${backendUrl}/api/v1/veterinary/vaccinations`,
          { ...payload, petId: selectedPetId },
          authConfig(token)
        );
      }

      setModalMode(null);
      setEditingVaccination(null);
      void loadVaccinations();
      void loadStats();
      void loadUpcoming();
      void loadOverdue();
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || "Failed to save vaccination.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vaccination) => {
    const petName = pets.find((p) => getId(p) === selectedPetId)?.name || "this pet";
    if (!window.confirm(`Remove "${vaccination.vaccineName}" from ${petName}'s records?`)) {
      return;
    }
    try {
      await axios.delete(
        `${backendUrl}/api/v1/veterinary/vaccinations/${getId(vaccination)}`,
        authConfig(token)
      );
      void loadVaccinations();
      void loadStats();
      void loadUpcoming();
      void loadOverdue();
    } catch (requestError) {
      if (!isAuthSessionHandledError(requestError)) {
        setError(requestError.response?.data?.message || "Failed to delete vaccination.");
      }
    }
  };

  const selectedPet = pets.find((p) => getId(p) === selectedPetId);
  const speciesCategories = getCategoriesForSpecies(selectedPet?.species);

  if (authStatus === "initializing" || (!token && authStatus !== "authenticated")) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  return (
    <main className="py-10">
      <section className="mb-7 flex flex-col justify-between gap-5 border-b border-line pb-7 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal">PET VACCINATIONS</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-[42px]">
            Vaccination management
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Track your pet's vaccination schedule, record completed doses, and stay on top of upcoming
            and overdue vaccines.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/pet-owner/veterinarians")}
            className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-sm font-bold text-ink transition-all duration-200 hover:border-teal/40 hover:bg-mist hover:text-teal"
          >
            <Calendar className="h-4 w-4" />
            Book Appointment
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingVaccination(null);
              setModalMode("form");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-teal/90"
          >
            <Plus className="h-4 w-4" />
            Add Vaccination
          </button>
        </div>
      </section>

      {/* Pet Selector */}
      <section className="mb-6 rounded-2xl border border-line/70 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Selected pet</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {selectedPet ? selectedPet.name : "No pet selected"}
            </p>
            {selectedPet && (
              <p className="mt-0.5 text-sm text-muted">
                {selectedPet.breed || selectedPet.species || "Breed not set"} ·{" "}
                {selectedPet.age ? `${selectedPet.age} years` : "Age unknown"}
              </p>
            )}
          </div>
          <div className="relative w-full min-w-[200px] sm:w-64">
            <select
              value={selectedPetId}
              onChange={(e) => {
                setSelectedPetId(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
            >
              <option value="">Select a pet</option>
              {pets.map((pet) => (
                <option key={getId(pet)} value={getId(pet)}>
                  {pet.name} ({pet.species})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Syringe}
            label="Total Vaccinations"
            value={stats.total}
            detail={`${stats.completed} completed`}
            tone="bg-teal/10 text-teal"
          />
          <SummaryCard
            icon={PawPrint}
            label="Up to Date"
            value={stats.upToDate}
            detail={stats.total > 0 ? `${Math.round((stats.upToDate / stats.total) * 100)}% of total` : "All up to date"}
            tone="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            icon={Calendar}
            label="Due Soon"
            value={stats.dueSoon}
            detail={stats.dueSoon > 0 ? "Within 7 days" : "None due soon"}
            tone="bg-amber-50 text-amber-600"
          />
          <SummaryCard
            icon={Calendar}
            label="Overdue"
            value={stats.overdue}
            detail={stats.overdue > 0 ? "Action needed" : "All current"}
            tone="bg-rose-50 text-rose-600"
          />
        </div>
      )}

      {/* Toolbar */}
      <section className="mb-6 rounded-2xl border border-line/70 bg-white p-4 shadow-soft sm:p-5">
        <div className="grid w-full min-w-0 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vaccines, manufacturer, batch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-line/80 bg-[#F6F9F9] px-10 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus:border-teal/50 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full min-w-0 cursor-pointer rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
          >
            <option value="all">All categories</option>
            {speciesCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full min-w-0 cursor-pointer rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
          >
            <option value="all">All statuses</option>
            <option value="up-to-date">Up to Date</option>
            <option value="due-soon">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-");
              setSortField(field);
              setSortDirection(dir);
            }}
            className="w-full min-w-0 cursor-pointer rounded-xl border border-line/80 bg-[#F6F9F9] px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-teal/50 focus:bg-white"
          >
            <option value="dueDate-desc">Due date (newest first)</option>
            <option value="dueDate-asc">Due date (oldest first)</option>
            <option value="createdAt-desc">Recently added</option>
            <option value="createdAt-asc">Oldest first</option>
            <option value="vaccineName-asc">Vaccine name (A-Z)</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setStatusFilter("all");
              setSortField("dueDate");
              setSortDirection("desc");
              setPage(1);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-sm font-bold text-ink transition-all duration-200 hover:border-teal/40 hover:bg-mist hover:text-teal"
          >
            <Filter className="h-4 w-4" />
            Reset
          </button>
        </div>
      </section>

      {/* Vaccination Records Table */}
      <section className="mb-8 rounded-2xl border border-line/70 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
          <h3 className="text-base font-bold text-ink">Vaccination records</h3>
          <span className="text-sm text-muted">{filteredVaccinations.length} record(s)</span>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F6F9F9]" />
              ))}
            </div>
          </div>
        ) : filteredVaccinations.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mist text-teal">
              <Syringe className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-ink">No vaccination records</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {selectedPetId
                ? `No vaccination records found for ${selectedPet?.name || "this pet"}.`
                : "Select a pet to view their vaccination records."}
            </p>
            {selectedPetId && (
              <button
                type="button"
                onClick={() => {
                  setEditingVaccination(null);
                  setModalMode("form");
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-teal/90"
              >
                <Plus className="h-4 w-4" />
                Add first vaccination
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-[#F6F9F9]">
                  <th className="px-6 py-3 text-left font-semibold text-ink">Vaccine</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Due date</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Completed</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Next dose</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Veterinarian</th>
                  <th className="px-6 py-3 text-left font-semibold text-ink">Clinic</th>
                  <th className="px-6 py-3 text-right font-semibold text-ink">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredVaccinations.map((vaccination) => {
                  const status = computeStatus(vaccination);
                  const statusTone = STATUS_TONES[status] || STATUS_TONES["up-to-date"];
                  const statusLabel = STATUS_LABELS[status] || status;
                  const dayDiff = daysFromNow(vaccination.nextDose || vaccination.dueDate);
                  const overdueDays = daysAgo(vaccination.dueDate || vaccination.nextDose);
                  const vetName = getVeterinarianName(vaccination);
                  const clinic = getClinicName(vaccination);
                  return (
                    <tr key={getId(vaccination)} className="transition-colors hover:bg-mist/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                            <Syringe className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-ink">{vaccination.vaccineName}</p>
                            {vaccination.manufacturer && (
                              <p className="mt-0.5 text-xs text-muted">{vaccination.manufacturer}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink">{vaccination.category || "—"}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink">{shortDate(vaccination.dueDate)}</p>
                        {status === "overdue" && overdueDays !== null && (
                          <p className="mt-0.5 text-xs font-semibold text-rose-600">
                            {overdueDays} day{overdueDays !== 1 ? "s" : ""} overdue
                          </p>
                        )}
                        {status === "due-soon" && dayDiff !== null && (
                          <p className="mt-0.5 text-xs font-semibold text-amber-600">
                            {dayDiff} day{dayDiff !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink">{shortDate(vaccination.completedDate)}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink">{shortDate(vaccination.nextDose)}</p>
                        {status !== "completed" && status !== "cancelled" && dayDiff !== null && dayDiff > 7 && (
                          <p className="mt-0.5 text-xs text-muted">{dayDiff} days</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink">{vetName}</td>
                      <td className="px-6 py-4 text-sm text-ink">{clinic}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {vaccination.certificate && (
                            <a
                              href={vaccination.certificate}
                              target="_blank"
                              rel="noreferrer"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-teal"
                              title="View Certificate"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {(status === "overdue" || status === "due-soon") && (
                            <button
                              type="button"
                              onClick={() => navigate("/pet-owner/veterinarians")}
                              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-teal hover:bg-teal/10 hover:text-teal"
                              title="Book Appointment"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Book
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailsVaccination(vaccination)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-ink"
                            title="View details"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVaccination(vaccination);
                              setModalMode("form");
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-ink"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(vaccination)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-mist hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-line/70 px-6 py-4">
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center justify-center rounded-lg border border-line/80 bg-white p-2 text-sm font-bold text-ink disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page >= pagination.pages}
                className="inline-flex items-center justify-center rounded-lg border border-line/80 bg-white p-2 text-sm font-bold text-ink disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Upcoming & Overdue */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Upcoming vaccinations</h3>
            <button
              type="button"
              onClick={() => navigate("/pet-owner/vaccinations")}
              className="text-xs font-semibold text-teal hover:text-teal/80"
            >
              View all →
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">No upcoming vaccinations scheduled.</p>
            ) : (
              upcoming.map((vaccination) => {
                const dayDiff = daysFromNow(vaccination.nextDose || vaccination.dueDate);
                const petName = getPetName(vaccination, pets);
                return (
                  <div
                    key={getId(vaccination)}
                    className="rounded-xl border border-line/60 bg-mist/50 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{vaccination.vaccineName}</p>
                      <StatusBadge vaccination={vaccination} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {petName} · Due {shortDate(vaccination.dueDate || vaccination.nextDose)}
                      {dayDiff !== null && (
                        <span className="ml-1 font-semibold text-amber-600">
                          ({dayDiff} day{dayDiff !== 1 ? "s" : ""} remaining)
                        </span>
                      )}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Overdue */}
        <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Overdue vaccinations</h3>
            <button
              type="button"
              onClick={() => navigate("/pet-owner/veterinarians")}
              className="text-xs font-semibold text-teal hover:text-teal/80"
            >
              Book appointment →
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {overdue.length === 0 ? (
              <p className="text-sm text-muted">No overdue vaccinations. All caught up!</p>
            ) : (
              overdue.map((vaccination) => {
                const overdueDays = daysAgo(vaccination.dueDate || vaccination.nextDose);
                const petName = getPetName(vaccination, pets);
                return (
                  <div
                    key={getId(vaccination)}
                    className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{vaccination.vaccineName}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                        Overdue
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {petName} · Past due {shortDate(vaccination.dueDate || vaccination.nextDose)}
                      {overdueDays !== null && (
                        <span className="ml-1 font-semibold text-rose-600">
                          ({overdueDays} day{overdueDays !== 1 ? "s" : ""} overdue)
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/pet-owner/veterinarians")}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white shadow-soft transition-all hover:bg-teal/90"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Book Appointment
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      {modalMode === "form" && (
        <VaccinationForm
          pet={selectedPet}
          initialData={editingVaccination}
          onClose={() => {
            setModalMode(null);
            setEditingVaccination(null);
          }}
          onSave={handleSave}
          loading={saving}
        />
      )}

      {detailsVaccination && (
        <VaccinationDetailsModal
          vaccination={detailsVaccination}
          pets={pets}
          onClose={() => setDetailsVaccination(null)}
        />
      )}
    </main>
  );
};

export default VaccinationDashboard;