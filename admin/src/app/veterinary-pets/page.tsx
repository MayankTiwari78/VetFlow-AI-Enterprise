"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryPetsPage() {
  return <PortalShell><VeterinaryAdminDashboard view="pets" /></PortalShell>;
}
