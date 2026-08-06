"use client";

import PortalShell from "../../../components/PortalShell";
import VeterinarianDashboard from "../../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianPetSearchPage() {
  return <PortalShell><VeterinarianDashboard view="search" /></PortalShell>;
}
