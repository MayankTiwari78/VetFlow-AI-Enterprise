"use client";

import DashboardLayout from "../../../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../../../features/Veterinary/PetOwnerDashboard";

export default function EditPetPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="pet-details" initialAction="edit" />
    </DashboardLayout>
  );
}
