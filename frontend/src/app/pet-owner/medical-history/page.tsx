"use client";

import DashboardLayout from "../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../features/Veterinary/PetOwnerDashboard";

export default function PetMedicalHistoryPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="medical" />
    </DashboardLayout>
  );
}
