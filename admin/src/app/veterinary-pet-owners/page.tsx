"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryPetOwnersPage() {
  return <PortalShell><VeterinaryAdminDashboard view="owners" /></PortalShell>;
}
