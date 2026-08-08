"use client";

import DashboardLayout from "../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../features/Veterinary/PetOwnerDashboard";

export default function PetOwnerPetsPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="pets" />
    </DashboardLayout>
  );
}