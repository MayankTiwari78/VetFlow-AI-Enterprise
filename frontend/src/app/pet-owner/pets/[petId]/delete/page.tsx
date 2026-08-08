"use client";

import DashboardLayout from "../../../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../../../features/Veterinary/PetOwnerDashboard";

export default function DeletePetPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="pet-details" initialAction="delete" />
    </DashboardLayout>
  );
}
