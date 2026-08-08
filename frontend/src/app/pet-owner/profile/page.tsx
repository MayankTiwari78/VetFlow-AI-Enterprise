"use client";

import DashboardLayout from "../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../features/Veterinary/PetOwnerDashboard";

export default function PetOwnerProfilePage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="profile" />
    </DashboardLayout>
  );
}
