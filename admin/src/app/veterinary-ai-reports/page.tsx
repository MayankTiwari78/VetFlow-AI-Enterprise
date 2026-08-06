"use client";

import PortalShell from "../../components/PortalShell";
import VeterinaryAdminDashboard from "../../features/VeterinaryAdmin/VeterinaryAdminDashboard";

export default function VeterinaryAiReportsPage() {
  return <PortalShell><VeterinaryAdminDashboard view="reports" /></PortalShell>;
}
