"use client";

import PortalShell from "../../components/PortalShell";
import VeterinarianDashboard from "../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianPetsPage() {
  return <PortalShell><VeterinarianDashboard view="pets" /></PortalShell>;
}
