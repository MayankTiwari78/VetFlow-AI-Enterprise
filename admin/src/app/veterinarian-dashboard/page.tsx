"use client";

import PortalShell from "../../components/PortalShell";
import VeterinarianDashboard from "../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianDashboardPage() {
  return <PortalShell><VeterinarianDashboard view="dashboard" /></PortalShell>;
}
