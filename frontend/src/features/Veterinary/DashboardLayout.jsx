"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PawPrint,
  Calendar,
  Stethoscope,
  FileText,
  Brain,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Activity,
  AlertTriangle,
  User,
  Menu,
  X,
  Heart,
  Shield,
  Clock
} from "lucide-react";
import { AppContext } from "../../context/AppContext";
import { logoutPatientSession } from "../../api/authClient";
import { useNavigate, Link } from "../../lib/routerCompat";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pet-owner/pets", label: "My Pets", icon: PawPrint },
  { to: "/pet-owner/appointments", label: "Appointments", icon: Calendar },
  { to: "/doctors", label: "Veterinarians", icon: Stethoscope },
  { to: "/pet-owner/medical-history", label: "Medical History", icon: FileText },
  { to: "/pet-owner/ai-reports", label: "AI Health Reports", icon: Brain },
  { to: "/pet-owner/profile", label: "Settings", icon: Settings }
];

const routeMeta = [
  { match: "/dashboard", title: "Dashboard", subtitle: "Overview of your pets' health" },
  { match: "/pet-owner/pets", title: "My Pets", subtitle: "Manage your pets' profiles and health records" },
  { match: "/pet-owner/appointments", title: "Appointments", subtitle: "Manage your veterinary appointments" },
  { match: "/doctors", title: "Veterinarians", subtitle: "Find and connect with certified veterinarians" },
  { match: "/pet-owner/medical-history", title: "Medical History", subtitle: "Complete timeline of your pets' medical records" },
  { match: "/pet-owner/ai-reports", title: "AI Health Reports", subtitle: "AI-powered preliminary health assessments" },
  { match: "/pet-owner/profile", title: "Settings", subtitle: "Manage your profile and preferences" }
];

const getRouteMeta = (pathname) => {
  const match = routeMeta.find((item) => pathname === item.match || pathname.startsWith(`${item.match}/`));
  return match || { title: "Dashboard", subtitle: "Overview of your pets' health" };
};

const dropdownItems = [
  { label: "My Profile", icon: User, to: "/pet-owner/profile" },
  { label: "Health Profile", icon: Heart, to: "/health-profile" },
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "My Pets", icon: PawPrint, to: "/pet-owner/pets" },
  { label: "Medical Timeline", icon: Clock, to: "/medical-timeline" },
  { label: "My Appointments", icon: Calendar, to: "/pet-owner/appointments" },
  { label: "Security", icon: Shield, to: "/security" }
];

const DashboardLayout = ({ children }) => {
  const pathname = usePathname() || "";
  const navigate = useNavigate();
  const { setToken, userData, backendUrl } = useContext(AppContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownShift, setDropdownShift] = useState(0);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const firstName = userData?.name?.split(" ")[0] || "Ravi";
  const email = userData?.email || "ravi123@gmail.com";
  const avatarInitial = String(firstName).charAt(0).toUpperCase() || "R";
  const meta = getRouteMeta(pathname);

  const logout = async () => {
    await logoutPatientSession(backendUrl);
    setToken("");
    navigate("/login");
  };

  const isActive = (to) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  // Close dropdown and sidebar on route change
  useEffect(() => {
    setShowDropdown(false);
    setSidebarOpen(false);
  }, [pathname]);

  // Robust dropdown positioning - keep within viewport
  useEffect(() => {
    if (!showDropdown || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const dropdownWidth = 232;
    const viewportWidth = window.innerWidth;
    const rightSpace = viewportWidth - rect.right;
    const shift = rightSpace < dropdownWidth + 8 ? dropdownWidth + 8 - rightSpace : 0;
    setDropdownShift(Math.min(shift, rect.right - 8));
  }, [showDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  return (
    <div className="flex min-h-screen w-full max-w-full bg-[#F6F9F9]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85vw] flex-col border-r border-line/70 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 pb-5 pt-6">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-bg text-white shadow-soft-lg">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" />
          </span>
          <span className="leading-none">
            <span className="block text-lg font-extrabold text-ink">
              MEDFLOW <span className="gradient-text">AI</span>
            </span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              Veterinary Platform
            </span>
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-mist lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-teal/10 text-teal"
                    : "text-muted hover:bg-mist hover:text-ink"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* AI Health Monitor Card */}
        <div className="mx-3 mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-900">AI Health Monitor</p>
              <p className="mt-1 text-[11px] leading-4 text-amber-800/80">
                Your pet's health needs attention
              </p>
            </div>
          </div>
          <p className="mt-2.5 rounded-lg bg-white/70 px-3 py-2 text-[11px] font-semibold text-amber-800">
            Luna — FeLV vaccine overdue
          </p>
        </div>

        {/* User section */}
        <div className="border-t border-line/70 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal/15 text-sm font-bold text-teal">
              {avatarInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{firstName}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col lg:ml-[260px]">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-line/70 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line/70 bg-white text-muted transition-colors hover:bg-mist hover:text-ink lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink">{meta.title}</h1>
              <p className="hidden truncate text-xs text-muted sm:block">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate("/appointment")}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-3 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-teal/90 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Book Appointment</span>
              <span className="sm:hidden">Book</span>
            </button>

            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-line/70 bg-white text-muted transition-colors hover:bg-mist hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                ref={triggerRef}
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-mist"
                aria-expanded={showDropdown}
                aria-haspopup="menu"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/15 text-sm font-bold text-teal">
                  {avatarInitial}
                </div>
                <span className="hidden text-sm font-bold text-ink md:block">{firstName}</span>
                <ChevronDown
                  className={`hidden h-4 w-4 text-muted transition-transform duration-200 md:block ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showDropdown && (
                <div
                  role="menu"
                  className="absolute top-full z-50 mt-2 w-56 max-w-[calc(100vw-16px)] rounded-2xl border border-line/70 bg-white p-2 shadow-soft-xl animate-fade-in-down"
                  style={{ right: `${dropdownShift}px` }}
                >
                  <div className="border-b border-line/70 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-ink">{firstName}</p>
                    <p className="truncate text-xs text-muted">{email}</p>
                  </div>
                  <div className="mt-1 max-h-[60vh] space-y-0.5 overflow-y-auto">
                    {dropdownItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(item.to);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-mist hover:text-ink"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                    <hr className="my-1 border-line/70" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;