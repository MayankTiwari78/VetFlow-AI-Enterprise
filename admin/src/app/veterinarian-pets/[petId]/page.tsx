"use client";

import PortalShell from "../../../components/PortalShell";
import VeterinarianDashboard from "../../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianPetDetailsPage() {
  return <PortalShell><VeterinarianDashboard view="pet-details" /></PortalShell>;
}
