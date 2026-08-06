"use client";

import PortalShell from "../../components/PortalShell";
import VeterinarianDashboard from "../../features/Veterinary/VeterinarianDashboard";

export default function VeterinarianMedicalRecordsPage() {
  return <PortalShell><VeterinarianDashboard view="records" /></PortalShell>;
}
