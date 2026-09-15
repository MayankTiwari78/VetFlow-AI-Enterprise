"use client";

import PortalShell from "../../components/PortalShell";
import ReviewQueue from "../../features/Veterinary/ReviewQueue";

/** Stage 4 — Veterinarian Review Queue (veterinarian + admin portals). */
export default function VeterinaryReviewQueuePage() {
  return (
    <PortalShell>
      <ReviewQueue />
    </PortalShell>
  );
}