"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryVaccinationsPage() {
  return <PortalShell><VeterinaryAdminDashboard view="vaccinations" /></PortalShell>;
}
