"use client";

import DashboardLayout from "../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../features/Veterinary/PetOwnerDashboard";

export default function PetOwnerPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="dashboard" />
    </DashboardLayout>
  );
}
