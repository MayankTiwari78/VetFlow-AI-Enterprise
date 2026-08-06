"use client";

import PortalShell from "../../../components/PortalShell";
import VeterinarianDashboard from "../../../features/Veterinary/VeterinarianDashboard";

export default function CreateVeterinaryMedicalRecordPage() {
  return <PortalShell><VeterinarianDashboard view="create-record" /></PortalShell>;
}
