"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryMedicalRecordsPage() {
  return <PortalShell><VeterinaryAdminDashboard view="records" /></PortalShell>;
}
