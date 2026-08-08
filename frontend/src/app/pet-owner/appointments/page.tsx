"use client";

import DashboardLayout from "../../../features/Veterinary/DashboardLayout";
import PetOwnerDashboard from "../../../features/Veterinary/PetOwnerDashboard";

export default function PetAppointmentsPage() {
  return (
    <DashboardLayout>
      <PetOwnerDashboard view="appointments" />
    </DashboardLayout>
  );
}
