"use client";

import PortalShell from "../../components/PortalShell";
import VeterinarianDashboard from "../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianAiReportsPage() {
  return <PortalShell><VeterinarianDashboard view="ai" /></PortalShell>;
}
