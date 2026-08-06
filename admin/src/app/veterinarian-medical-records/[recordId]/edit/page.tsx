"use client";

import PortalShell from "../../../../components/PortalShell";
import VeterinarianDashboard from "../../../../features/Veterinary/VeterinarianDashboard";

export default function EditVeterinaryMedicalRecordPage() {
  return <PortalShell><VeterinarianDashboard view="edit-record" /></PortalShell>;
}
