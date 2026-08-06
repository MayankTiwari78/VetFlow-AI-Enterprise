"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryAdminDashboardPage() {
  return <PortalShell><VeterinaryAdminDashboard view="dashboard" /></PortalShell>;
}
