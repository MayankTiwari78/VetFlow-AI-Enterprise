"use client";

import DashboardLayout from "../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../features/Veterinary/PetOwnerDashboard";

export default function PetVaccinationsPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="vaccinations" />
    </DashboardLayout>
  );
}
