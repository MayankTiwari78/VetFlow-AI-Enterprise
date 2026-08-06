"use client";

import PortalShell from "../../components/PortalShell";
import VeterinarianDashboard from "../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianVaccinationsPage() {
  return <PortalShell><VeterinarianDashboard view="vaccinations" /></PortalShell>;
}
