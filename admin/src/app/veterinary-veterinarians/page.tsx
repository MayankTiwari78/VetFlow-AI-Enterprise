"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryVeterinariansPage() {
  return <PortalShell><VeterinaryAdminDashboard view="veterinarians" /></PortalShell>;
}
