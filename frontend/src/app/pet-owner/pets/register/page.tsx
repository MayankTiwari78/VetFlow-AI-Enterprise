"use client";

import DashboardLayout from "../../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../../features/Veterinary/PetOwnerDashboard";

export default function RegisterPetPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="register" />
    </DashboardLayout>
  );
}
