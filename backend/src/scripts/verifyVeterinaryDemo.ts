import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/database.js";

const run = async (): Promise<void> => {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }

  const counts = {
    veterinarians: await db.collection("veterinarians").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    petOwners: await db.collection("pet_owners").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    pets: await db.collection("pets").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    vaccinations: await db.collection("vaccinations").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    medicalRecords: await db.collection("pet_medical_records").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    aiReports: await db.collection("ai_reports").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    appointments: await db.collection("appointments").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    demoDoctors: await db.collection("doctors").countDocuments({ demoDataLabel: "Veterinary demo data" }),
    demoUsers: await db.collection("users").countDocuments({ demoDataLabel: "Veterinary demo data" })
  };

  console.log(JSON.stringify(counts, null, 2));
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Verification failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });